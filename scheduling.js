const workspace = document.querySelector('#scheduling-workspace');
const status = document.querySelector('#scheduling-status');
const refresh = document.querySelector('#scheduling-refresh');
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const format = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const timeLabel = value => format.format(new Date(value + ':00+08:00')) + ' PHT';
const pht = value => new Date(value + 8 * 3600_000).toISOString().slice(0, 16);
const services = ['Guidance consultation', 'Follow-up consultation', 'Psychological testing'];
const givenTimes = Array.from({ length: 41 }, (_, index) => {
  const hour = 8 + Math.floor(index / 4);
  const minutes = String(index % 4 * 15).padStart(2, '0');
  return `<option value="${String(hour).padStart(2, '0')}:${minutes}">${hour % 12 || 12}:${minutes} ${hour < 12 ? 'AM' : 'PM'}</option>`;
}).join('');
let schedule;
let busy = false;
const requestFilters = { query: '', status: '', kind: '', date: '', order: 'newest' };
const requestStatuses = ['Pending', 'Accepted', 'Ongoing', 'Completed', 'Declined', 'Cancelled'];

function message(text) {
  status.textContent = text;
  status.hidden = false;
}

const testing = location.pathname === '/staff-test';
const testEmail = 'staff@example.invalid';
const testStaff = [
  { email: testEmail, name: 'Test Guidance Coordinator' },
  { email: 'counselor@example.invalid', name: 'Sample Guidance Counselor' },
  { email: 'associate@example.invalid', name: 'Sample Guidance Associate' },
  { email: 'testing@example.invalid', name: 'Sample Psychometrician' },
];

function createPracticeSchedule() {
  const date = pht(Date.now() + 86400_000).slice(0, 10);
  return { staffMode: true, staff: testStaff, slots: [{ id: 1, starts_at: date + 'T09:00', reserved: 1 }],
    requests: [
      { id: 1, kind: 'appointment', service: 'Guidance consultation', staff_email: testEmail, student_email: 'sample-student@example.invalid', status: 'Pending', starts_at: date + 'T09:00' },
      { id: 2, kind: 'referral', service: 'Psychological testing', staff_email: testEmail, student_email: 'sample-referral@example.invalid', status: 'Pending', starts_at: null },
    ] };
}

const practiceSchedule = testing ? createPracticeSchedule() : null;
let nextPracticeSlot = 2;

function practiceApi(path, body) {
  if (!path) return practiceSchedule;
  if (path === '/slots' && body.action === 'add') {
    if (body.start <= pht(Date.now())) throw new Error('Choose a future time.');
    if (practiceSchedule.slots.some(slot => slot.starts_at === body.start)) throw new Error('That time is already published.');
    practiceSchedule.slots.push({ id: nextPracticeSlot++, starts_at: body.start, reserved: 0 });
    practiceSchedule.slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return;
  }
  if (path === '/slots' && body.action === 'remove') {
    practiceSchedule.slots = practiceSchedule.slots.filter(slot => slot.id !== body.id || slot.reserved);
    return;
  }
  if (path === '/decision') {
    const row = practiceSchedule.requests.find(request => request.id === body.id);
    if (!row) throw new Error('This sample request is unavailable.');
    const releaseTime = body.action === 'decline' || body.action === 'refer';
    if (releaseTime) {
      const slot = practiceSchedule.slots.find(item => item.starts_at === row.starts_at);
      if (slot) slot.reserved = 0;
    }
    if (body.action === 'refer') {
      practiceSchedule.requests = practiceSchedule.requests.filter(request => request.id !== row.id);
      return;
    }
    row.status = { accept: 'Accepted', decline: 'Declined', start: 'Ongoing', complete: 'Completed' }[body.action];
  }
}

async function api(path, body) {
  if (testing) return practiceApi(path, body);
  const response = await fetch('/api/scheduling' + path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  if (response.status === 401) {
    location.assign('/login.html');
    throw new Error('Please log in again.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Scheduling is temporarily unavailable.');
  return data;
}

function people(exclude) {
  return schedule.staff.filter(person => person.email !== exclude).map(person =>
    `<option value="${escapeText(person.email)}">${escapeText(person.name)}</option>`).join('');
}

function button(action, id, text) {
  return `<button type="button" class="btn light" data-decision="${action}" data-id="${id}">${text}</button>`;
}

function requestCard(row) {
  const person = schedule.staff.find(staff => staff.email === row.staff_email);
  const actions = schedule.staffMode ? {
    Pending: button('accept', row.id, 'Accept') + button('decline', row.id, 'Decline'),
    Accepted: button('start', row.id, 'Mark ongoing'),
    Ongoing: button('complete', row.id, 'Complete'),
  }[row.status] : ['Pending','Accepted'].includes(row.status) ? button('cancel', row.id, 'Cancel request') : '';
  const confirmed = row.starts_at && ['Accepted','Ongoing'].includes(row.status) && !testing;
  return `<article class="visit-card"><div class="visit-heading"><h3>${escapeText(row.service)}</h3><span class="visit-status">${escapeText(row.status)}</span></div>
    <p>${row.kind === 'referral' ? 'Referral' : 'Appointment'} &middot; ${row.starts_at ? timeLabel(row.starts_at) : 'Time to be arranged'}</p>
    <p>${escapeText(schedule.staffMode ? row.student_email : person?.name || 'Guidance Center')}</p>
    <div class="workflow-actions">${actions || ''}
      ${confirmed ? button('calendar', row.id, 'Add to calendar') + button('copy-time', row.id, 'Copy time') : ''}</div>
    ${schedule.staffMode && ['Pending', 'Accepted'].includes(row.status) ? `<form class="workflow-form" data-refer-id="${row.id}">
      <div class="field"><label for="refer-${row.id}">Refer to another team member</label><select name="staff" id="refer-${row.id}" required><option value="">Select personnel</option>${people(row.staff_email)}</select></div>
      <button class="btn outline" type="submit">Send referral</button></form>` : ''}
  </article>`;
}

function staffTools() {
  return `<section class="panel"><h2 class="section-title">Publish availability</h2>
    <p class="subtitle">Add a future start time from 8:00 AM to 6:00 PM Philippine time.</p>
    <form id="slot-form" class="workflow-form">
      <div class="visit-date-fields">
        <div class="field"><label for="slot-date">Date</label><input id="slot-date" name="date" type="date" min="${pht(Date.now()).slice(0,10)}" required></div>
        <div class="field"><label for="slot-time">Time (PHT)</label><select id="slot-time" name="time" required><option value="">Choose a time</option>${givenTimes}</select></div>
      </div>
      <button class="btn maroon" type="submit">Publish time</button>
    </form>
    <h3>Upcoming availability</h3>
    ${schedule.slots.length ? schedule.slots.map(slot => `<div class="scheduling-slot"><span>${timeLabel(slot.starts_at)}</span>
      ${slot.reserved ? '<span>Reserved</span>' : `<button type="button" class="btn outline" data-remove-slot="${slot.id}">Remove</button>`}</div>`).join('') : '<p class="empty">No published times yet.</p>'}
  </section>`;
}

function studentTools() {
  return `<section class="panel"><h2 class="section-title">Send a request</h2>
    <form id="request-form" class="workflow-form">
      <div class="field"><label for="request-kind">Request type</label><select name="kind" id="request-kind"><option value="appointment">Appointment</option><option value="referral">Self-referral</option></select></div>
      <div class="field"><label for="request-staff">Guidance personnel</label><select name="staff" id="request-staff" required><option value="">Select personnel</option>${people()}</select></div>
      <div class="field"><label for="request-service">Service</label><select name="service" id="request-service" required><option value="">Select a service</option>${services.map(service => `<option>${service}</option>`).join('')}</select></div>
      <div class="field" id="slot-day-field"><label for="request-day">Filter times by date</label><select id="request-day"><option value="">All dates</option></select></div>
      <div class="field" id="request-slot-field"><label for="request-slot">Available Philippine time</label><select name="slot" id="request-slot" required><option value="">Choose personnel first</option></select></div>
      <button class="btn maroon" type="submit">Send request</button>
    </form>
  </section>`;
}

function filteredRequests(rows, filters) {
  return rows.filter(row => {
    const person = schedule.staff.find(staff => staff.email === row.staff_email);
    const text = [row.service,row.status,row.kind,row.student_email,person?.name].join(' ').toLowerCase();
    return (!filters.query || text.includes(filters.query.trim().toLowerCase())) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.kind || row.kind === filters.kind) &&
      (!filters.date || row.starts_at?.startsWith(filters.date));
  }).sort((a,b) => filters.order === 'soonest'
    ? (a.starts_at || '9999').localeCompare(b.starts_at || '9999') || b.id - a.id
    : b.id - a.id);
}

function requestControls() {
  return `<div class="request-filters">
    <div class="field"><label for="request-query">Search requests</label><input type="search" id="request-query" data-request-filter="query" placeholder="Service or person" value="${escapeText(requestFilters.query)}"></div>
    <div class="field"><label for="request-status-filter">Status</label><select id="request-status-filter" data-request-filter="status"><option value="">All statuses</option>${requestStatuses.map(name => `<option ${requestFilters.status === name ? 'selected' : ''}>${name}</option>`).join('')}</select></div>
    <div class="field"><label for="request-kind-filter">Type</label><select id="request-kind-filter" data-request-filter="kind"><option value="">All types</option><option value="appointment" ${requestFilters.kind === 'appointment' ? 'selected' : ''}>Appointments</option><option value="referral" ${requestFilters.kind === 'referral' ? 'selected' : ''}>Referrals</option></select></div>
    <div class="field"><label for="request-date-filter">Scheduled date</label><input id="request-date-filter" type="date" data-request-filter="date" value="${escapeText(requestFilters.date)}"></div>
    <div class="field"><label for="request-order">Sort</label><select id="request-order" data-request-filter="order"><option value="newest">Newest request</option><option value="soonest" ${requestFilters.order === 'soonest' ? 'selected' : ''}>Scheduled time</option></select></div>
    <button class="btn outline" type="button" id="request-clear-filters">Clear filters</button>
  </div><p id="request-count" role="status"></p><div id="request-results"></div>`;
}

function drawRequests() {
  const rows = filteredRequests(schedule.requests, requestFilters);
  document.querySelector('#request-count').textContent = `${rows.length} of ${schedule.requests.length} requests`;
  document.querySelector('#request-results').innerHTML = rows.length ? rows.map(requestCard).join('') : '<p class="empty">No requests match these filters.</p>';
}

function scheduleHighlights() {
  const current = pht(Date.now());
  const next = schedule.requests.filter(row => row.status === 'Accepted' && row.starts_at > current)
    .sort((a,b) => a.starts_at.localeCompare(b.starts_at))[0];
  return `<section class="scheduling-highlights" aria-label="Scheduling summary">
    <div><span>Pending</span><strong>${schedule.requests.filter(row => row.status === 'Pending').length}</strong></div>
    <div><span>Ongoing</span><strong>${schedule.requests.filter(row => row.status === 'Ongoing').length}</strong></div>
    <div><span>Next accepted visit</span><strong>${next ? timeLabel(next.starts_at) : 'None yet'}</strong></div>
  </section>`;
}

function saveCalendar(row) {
  const utc = value => new Date(value).toISOString().replace(/[-:]|\.\d{3}/g,'');
  const start = utc(row.starts_at + ':00+08:00');
  const stamp = utc(Date.now());
  const event = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GuideTrack//Scheduling//EN',
    'BEGIN:VEVENT',`UID:guidetrack-${row.id}@guidetrack`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,
    'SUMMARY:Guidance Center appointment','END:VEVENT','END:VCALENDAR',''].join('\r\n');
  const url = URL.createObjectURL(new Blob([event], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'guidetrack-appointment.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function draw() {
  document.querySelector('#staff-test-link').hidden = !schedule.staffTestAvailable;
  if (testing) {
    document.querySelector('#staff-test-link').hidden = false;
    document.querySelector('#staff-test-link').href = '/scheduling.html';
    document.querySelector('#staff-test-link').textContent = 'Back to live scheduling';
  }
  document.querySelector('#scheduling-title').textContent = testing ? 'Guidance Personnel test view' : schedule.staffMode ? 'Guidance Personnel workspace' : 'Live scheduling';
  document.querySelector('#scheduling-intro').textContent = testing ? 'Practice with sample requests and availability. Changes reset when you reload and never reach the live schedule.' : schedule.staffMode ? 'Manage your availability and assigned appointments and referrals.' : 'Request a time or send a self-referral, then check its status here.';
  workspace.innerHTML = `${scheduleHighlights()}<div class="two-col">${schedule.staffMode ? staffTools() : studentTools()}
    <section class="panel"><h2 class="section-title">${schedule.staffMode ? 'Assigned requests' : 'My requests'}</h2>
    ${requestControls()}</section></div>`;
  drawRequests();
}

function updateSlots(preserveDay) {
  const field = document.querySelector('#request-slot-field');
  const dayField = document.querySelector('#slot-day-field');
  const day = document.querySelector('#request-day');
  const previous = preserveDay ? day.value : '';
  const select = document.querySelector('#request-slot');
  const staff = document.querySelector('#request-staff').value;
  const referral = document.querySelector('#request-kind').value === 'referral';
  field.hidden = referral;
  dayField.hidden = referral;
  select.disabled = referral;
  const slots = schedule.slots.filter(slot => slot.staff_email === staff);
  const dates = [...new Set(slots.map(slot => slot.starts_at.slice(0,10)))];
  day.innerHTML = '<option value="">All dates</option>' + dates.map(date => `<option>${date}</option>`).join('');
  day.value = dates.includes(previous) ? previous : '';
  const visible = slots.filter(slot => !day.value || slot.starts_at.startsWith(day.value));
  select.innerHTML = `<option value="">${visible.length ? 'Choose an available time' : staff ? 'No published times available' : 'Choose personnel first'}</option>` +
    visible.map(slot => `<option value="${slot.id}">${timeLabel(slot.starts_at)}</option>`).join('');
}

async function run(action, successText) {
  if (busy) return;
  busy = true;
  refresh.disabled = true;
  try {
    if (action) {
      await action();
      message(successText);
    }
    schedule = await api('');
    draw();
  } catch (error) {
    message(error.message);
  } finally {
    busy = false;
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', () => run());
workspace.addEventListener('change', event => {
  if (['request-staff', 'request-kind', 'request-day'].includes(event.target.id)) updateSlots(event.target.id === 'request-day');
  if (event.target.dataset.requestFilter && event.target.id !== 'request-query') {
    requestFilters[event.target.dataset.requestFilter] = event.target.value;
    drawRequests();
  }
});
workspace.addEventListener('input', event => {
  if (event.target.id !== 'request-query') return;
  requestFilters.query = event.target.value;
  drawRequests();
});
workspace.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  if (form.id === 'slot-form') {
    run(() => api('/slots', { action: 'add', start: values.date + 'T' + values.time }), 'Availability published.');
  } else if (form.id === 'request-form') {
    run(() => api('/request', { ...values, slot: Number(values.slot) }), 'Request sent.');
  } else if (form.dataset.referId) {
    run(() => api('/decision', { action: 'refer', id: Number(form.dataset.referId), staff: values.staff }), 'Referral sent to the selected team member.');
  }
});
workspace.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.removeSlot) run(() => api('/slots', { action: 'remove', id: Number(button.dataset.removeSlot) }), 'Availability removed.');
  if (button.id === 'request-clear-filters') {
    Object.assign(requestFilters, { query: '', status: '', kind: '', date: '', order: 'newest' });
    workspace.querySelectorAll('[data-request-filter]').forEach(input => { input.value = requestFilters[input.dataset.requestFilter]; });
    drawRequests();
  }
  if (!button.dataset.decision) return;
  const id = Number(button.dataset.id);
  const row = schedule.requests.find(request => request.id === id);
  if (button.dataset.decision === 'cancel') {
    if (confirm('Cancel this guidance request?')) run(() => api('/cancel', {id}), 'Request cancelled.');
  } else if (button.dataset.decision === 'calendar' && row?.starts_at) {
    saveCalendar(row);
  } else if (button.dataset.decision === 'copy-time' && row?.starts_at) {
    try { await navigator.clipboard.writeText(timeLabel(row.starts_at)); message('Appointment time copied.'); }
    catch { message('Could not copy. You can select the appointment time from the request.'); }
  } else run(() => api('/decision', { action: button.dataset.decision, id }), 'Request updated.');
});

run();
