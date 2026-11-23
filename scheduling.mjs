import { staff } from './personnel.mjs';

const services = ['Guidance consultation', 'Follow-up consultation', 'Psychological testing'];
const datePattern = /^\d{4}-\d{2}-\d{2}T(?:(?:0[89]|1[0-7]):(?:00|15|30|45)|18:00)$/;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

function validTime(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const date = new Date(value + ':00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value &&
    date.getTime() - 8 * 3600_000 > Date.now();
}

async function schema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS staff_slots (
      id INTEGER PRIMARY KEY, staff_email TEXT NOT NULL REFERENCES staff_members(email),
      starts_at TEXT NOT NULL, withdrawn INTEGER NOT NULL DEFAULT 0, UNIQUE (staff_email, starts_at)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS guidance_requests (
      id INTEGER PRIMARY KEY, student_email TEXT NOT NULL REFERENCES accounts(email),
      staff_email TEXT NOT NULL, kind TEXT NOT NULL, service TEXT NOT NULL,
      slot_id INTEGER REFERENCES staff_slots(id), status TEXT NOT NULL DEFAULT 'Pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS guidance_request_slot ON guidance_requests(slot_id)
      WHERE slot_id IS NOT NULL AND status IN ('Pending', 'Accepted', 'Ongoing', 'Completed')`),
    db.prepare('CREATE INDEX IF NOT EXISTS guidance_request_student ON guidance_requests(student_email)'),
    db.prepare('CREATE INDEX IF NOT EXISTS guidance_request_staff ON guidance_requests(staff_email)'),
  ]);
}

export async function scheduling(request, db, email, staffMember) {
  const pathname = new URL(request.url).pathname;
  await schema(db);
  if (request.method === 'GET' && pathname === '/api/scheduling') {
    const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16);
    const slotQuery = db.prepare(`SELECT s.id, s.staff_email, s.starts_at, EXISTS (
      SELECT 1 FROM guidance_requests r WHERE r.slot_id = s.id AND r.status IN ('Pending','Accepted','Ongoing','Completed')
    ) AS reserved FROM staff_slots s WHERE s.starts_at > ? AND s.withdrawn = 0
      ${staffMember ? ' AND s.staff_email = ?' : `AND NOT EXISTS (
        SELECT 1 FROM guidance_requests r WHERE r.slot_id = s.id AND r.status IN ('Pending','Accepted','Ongoing','Completed')
      )`}
      ORDER BY s.starts_at LIMIT 250`);
    const requests = db.prepare(`SELECT r.id, r.kind, r.service, r.status, r.staff_email, s.starts_at
      ${staffMember ? ', r.student_email' : ''}
      FROM guidance_requests r LEFT JOIN staff_slots s ON s.id = r.slot_id
      WHERE ${staffMember ? 'r.staff_email' : 'r.student_email'} = ? ORDER BY r.id DESC LIMIT 250`).bind(email);
    const [slots, schedule] = await db.batch([staffMember ? slotQuery.bind(today, email) : slotQuery.bind(today), requests]);
    return json({ staff: staff.map(({ email, firstName, lastName, role }) => ({ email, name: firstName + ' ' + lastName, role })),
      staffMode: staffMember, slots: slots.results, requests: schedule.results });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const raw = await request.text();
  if (raw.length > 4000) return json({ error: 'Invalid request.' }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

  if (pathname === '/api/scheduling/request') {
    if (!services.includes(body.service) || !staff.some(person => person.email === body.staff)) {
      return json({ error: 'Select a team member and service.' }, 400);
    }
    if (body.kind === 'referral') {
      await db.prepare(`INSERT INTO guidance_requests (student_email, staff_email, kind, service)
        VALUES (?, ?, 'referral', ?)`).bind(email, body.staff, body.service).run();
      return json({ ok: true }, 201);
    }
    if (body.kind !== 'appointment' || !Number.isSafeInteger(body.slot)) return json({ error: 'Select an available time.' }, 400);
    const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16);
    const result = await db.prepare(`INSERT OR IGNORE INTO guidance_requests (student_email, staff_email, kind, service, slot_id)
      SELECT ?, staff_email, 'appointment', ?, id FROM staff_slots WHERE id = ? AND staff_email = ? AND starts_at > ? AND withdrawn = 0`)
      .bind(email, body.service, body.slot, body.staff, today).run();
    return result.meta.changes ? json({ ok: true }, 201) : json({ error: 'That time is no longer available.' }, 409);
  }

  if (!staffMember) return json({ error: 'Guidance Personnel access required.' }, 403);
  if (pathname === '/api/scheduling/slots') {
    if (body.action === 'add' && validTime(body.start)) {
      const result = await db.prepare(`INSERT INTO staff_slots (staff_email, starts_at) VALUES (?, ?)
        ON CONFLICT(staff_email, starts_at) DO UPDATE SET withdrawn = 0 WHERE withdrawn = 1`)
        .bind(email, body.start).run();
      return result.meta.changes ? json({ ok: true }, 201) : json({ error: 'That time is already published.' }, 409);
    }
    if (body.action === 'remove' && Number.isSafeInteger(body.id)) {
      const result = await db.prepare(`UPDATE staff_slots SET withdrawn = 1 WHERE id = ? AND staff_email = ? AND withdrawn = 0 AND NOT EXISTS (
        SELECT 1 FROM guidance_requests WHERE slot_id = ? AND status IN ('Pending','Accepted','Ongoing','Completed'))`)
        .bind(body.id, email, body.id).run();
      return result.meta.changes ? json({ ok: true }) : json({ error: 'This time has a request or is unavailable.' }, 409);
    }
    return json({ error: 'Choose a future date and a 15-minute time between 8:00 AM and 6:00 PM PHT.' }, 400);
  }

  if (pathname === '/api/scheduling/decision' && Number.isSafeInteger(body.id)) {
    const transitions = {
      accept: ['Pending', 'Accepted'], decline: ['Pending', 'Declined'],
      start: ['Accepted', 'Ongoing'], complete: ['Ongoing', 'Completed'],
    };
    if (Object.hasOwn(transitions, body.action)) {
      const [from, to] = transitions[body.action];
      const result = await db.prepare('UPDATE guidance_requests SET status = ? WHERE id = ? AND staff_email = ? AND status = ?')
        .bind(to, body.id, email, from).run();
      return result.meta.changes ? json({ ok: true }) : json({ error: 'This request has already changed or belongs to someone else.' }, 409);
    }
    if (body.action === 'refer' && body.staff !== email && staff.some(person => person.email === body.staff)) {
      const result = await db.prepare(`UPDATE guidance_requests SET staff_email = ?, kind = 'referral', slot_id = NULL, status = 'Pending'
        WHERE id = ? AND staff_email = ? AND status IN ('Pending','Accepted')`).bind(body.staff, body.id, email).run();
      return result.meta.changes ? json({ ok: true }) : json({ error: 'This request can no longer be referred.' }, 409);
    }
  }
  return json({ error: 'Invalid scheduling action.' }, 400);
}
