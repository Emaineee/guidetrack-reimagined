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

function message(text) {
  status.textContent = text;
  status.hidden = false;
}

async function api(path, body) {
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
  const actions = schedule.staffMode && {
    Pending: button('accept', row.id, 'Accept') + button('decline', row.id, 'Decline'),
    Accepted: button('start', row.id, 'Mark ongoing'),
    Ongoing: button('complete', row.id, 'Complete'),
  }[row.status];
  return `<article class="visit-card"><div class="visit-heading"><h3>${escapeText(row.service)}</h3><span class="visit-status">${escapeText(row.status)}</span></div>
    <p>${row.kind === 'referral' ? 'Referral' : 'Appointment'} &middot; ${row.starts_at ? timeLabel(row.starts_at) : 'Time to be arranged'}</p>
    <p>${escapeText(schedule.staffMode ? row.student_email : person?.name || 'Guidance Center')}</p>
    <div class="workflow-actions">${actions || ''}</div>
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
      <div class="field" id="request-slot-field"><label for="request-slot">Available Philippine time</label><select name="slot" id="request-slot" required><option value="">Choose personnel first</option></select></div>
      <button class="btn maroon" type="submit">Send request</button>
    </form>
  </section>`;
}

function draw() {
  document.querySelector('#scheduling-title').textContent = schedule.staffMode ? 'Guidance Personnel workspace' : 'Live scheduling';
  document.querySelector('#scheduling-intro').textContent = schedule.staffMode ? 'Manage your availability and assigned appointments and referrals.' : 'Request a time or send a self-referral, then check its status here.';
  workspace.innerHTML = `<div class="two-col">${schedule.staffMode ? staffTools() : studentTools()}
    <section class="panel"><h2 class="section-title">${schedule.staffMode ? 'Assigned requests' : 'My requests'}</h2>
    ${schedule.requests.map(requestCard).join('') || '<p class="empty">No requests yet.</p>'}</section></div>`;
}

function updateSlots() {
  const field = document.querySelector('#request-slot-field');
  const select = document.querySelector('#request-slot');
  const staff = document.querySelector('#request-staff').value;
  const referral = document.querySelector('#request-kind').value === 'referral';
  field.hidden = referral;
  select.disabled = referral;
  const slots = schedule.slots.filter(slot => slot.staff_email === staff);
  select.innerHTML = `<option value="">${slots.length ? 'Choose an available time' : staff ? 'No published times available' : 'Choose personnel first'}</option>` +
    slots.map(slot => `<option value="${slot.id}">${timeLabel(slot.starts_at)}</option>`).join('');
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
  if (['request-staff', 'request-kind'].includes(event.target.id)) updateSlots();
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
workspace.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.removeSlot) run(() => api('/slots', { action: 'remove', id: Number(button.dataset.removeSlot) }), 'Availability removed.');
  if (button.dataset.decision) run(() => api('/decision', { action: button.dataset.decision, id: Number(button.dataset.id) }), 'Request updated.');
});

run();
