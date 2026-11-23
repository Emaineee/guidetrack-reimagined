const personnel = [
  { id: 'cardino', name: 'Ma. Clarissa H. Cardino, RGC, RPm', role: 'Guidance Coordinator and Guidance Counselor', cluster: 'Allied Health and Business Clusters', email: 'clarissa.cardino@perpetualdalta.edu.ph' },
  { id: 'vanguardia', name: 'Anne Gelyn B. Vanguardia, RGC, RPm', role: 'Guidance Counselor', cluster: 'Technology and HUMSS Cluster', email: 'annegelyn.vanguardia@perpetualdalta.edu.ph' },
  { id: 'endrinal', name: 'Alodia M. Endrinal', role: 'Guidance Associate', cluster: 'University Guidance Center', email: 'alodia.endrinal@perpetualdalta.edu.ph' },
  { id: 'guevarra', name: 'Brian Nickie B. Guevarra, RPm', role: 'Psychometrician', cluster: 'University Guidance Center', email: 'briannickie.guevarra@perpetualdalta.edu.ph' },
];

const roles = {
  student: 'Student',
  coordinator: 'Guidance Coordinator',
  counselor: 'Guidance Counselor',
  associate: 'Guidance Associate',
  psychometrician: 'Psychometrician',
};
const staffRoles = { cardino: 'coordinator', vanguardia: 'counselor', endrinal: 'associate', guevarra: 'psychometrician' };
const services = ['Guidance consultation', 'Follow-up consultation', 'Psychological testing'];
const titles = {
  home: 'Overview', dashboard: 'Dashboard', appointments: 'Appointments', calendar: 'Calendar',
  'walk-in': 'Walk-ins', guidance: 'Guidance Personnel', messages: 'Messaging',
  referrals: 'Referrals', resources: 'Resources', wellbeing: 'Student Well-being',
};
const state = { role: 'student', visits: [], messages: [], referrals: [], nextId: 1, calendar: { month: '', day: '', staff: '', status: '', kind: '' } };
const timeZone = 'Asia/Manila';
const dateFormat = new Intl.DateTimeFormat('en-PH', { timeZone, dateStyle: 'medium', timeStyle: 'short' });
const partsFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const content = document.querySelector('#content');
const toastElement = document.querySelector('#toast');
let toastTimer;
const minute = 60_000;
const staffOptions = personnel.map(({ id, name }) => `<option value="${id}">${name}</option>`).join('');
const serviceOptions = services.map(service => `<option>${service}</option>`).join('');
const selectedPerson = id => personnel.find(person => person.id === id);
const asInput = value => partsFormat.format(value).replace(' ', 'T');
const timestamp = value => dateFormat.format(value) + ' PHT';
const fromInput = value => Date.parse(value + ':00+08:00');
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function toast(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.style.display = 'block';
  toastTimer = setTimeout(() => { toastElement.style.display = 'none'; }, 4800);
}

function intro(title, description) {
  return `<div class="page-intro"><h1 class="page-title">${title}</h1><p class="subtitle">${description}</p></div>`;
}

function field(label, id, control) {
  return `<div class="field"><label for="${id}">${label}</label>${control}</div>`;
}

function select(id, options, prompt) {
  return `<select id="${id}" required><option value="">${prompt}</option>${options}</select>`;
}

function previewNote() {
  return '<p class="note">Use sample information only. Preview records stay in memory until you reload or close this page.</p>';
}

function home() {
  const links = [
    ['appointments', '&#9638;', 'Book an appointment', 'Choose a guidance service and find a time to meet.'],
    ['walk-in', '&#8594;', 'Walk-in visits', 'See how the Guidance Center handles an unscheduled visit.'],
    ['guidance', '&#9671;', 'Meet your guidance team', 'Find your counselor and their contact details.'],
  ];
  return `<section class="portal-hero">
    <div class="portal-hero-copy">
      <span class="portal-campus-label">UPHSD DALTA &middot; Calamba Campus</span>
      <h1>We care. We listen.<br><em>We understand.</em></h1>
      <p>If you need hands to care, ears to listen, and a heart to understand, we are here for you.</p>
      <div class="portal-hero-actions">
        <a class="btn gold" href="#appointments">Explore appointments <span aria-hidden="true">&rarr;</span></a>
        <a class="portal-hero-link" href="#guidance">Meet your guidance team</a>
      </div>
    </div>
  </section>
  <section aria-labelledby="portal-services">
    <div class="portal-section-heading"><h2 id="portal-services">How can we help?</h2><a href="#dashboard">View dashboard <span aria-hidden="true">&nearr;</span></a></div>
    <div class="portal-service-grid">
      ${links.map(([page, icon, title, description]) => `<a class="portal-service" href="#${page}">
        <span class="portal-service-icon" aria-hidden="true">${icon}</span>
        <span class="portal-service-arrow" aria-hidden="true">&nearr;</span>
        <h3>${title}</h3><p>${description}</p></a>`).join('')}
    </div>
  </section>
  <section class="portal-wellbeing" aria-labelledby="portal-wellbeing">
    <div><h2 id="portal-wellbeing">Make space for well-being.</h2>
      <p>Explore practical ways to handle stress, find support, and help a friend.</p></div>
    <a class="btn gold" href="#wellbeing">Explore Student Well-being <span aria-hidden="true">&rarr;</span></a>
  </section>`;
}

function matchesPersonnel(person, query, role) {
  const searchable = [person.name, person.role, person.cluster, person.email].join(' ').toLowerCase();
  return (!role || staffRoles[person.id] === role || (role === 'counselor' && person.id === 'cardino')) &&
    query.trim().toLowerCase().split(/\s+/).every(word => searchable.includes(word));
}

function guidance() {
  const roleOptions = Object.entries(roles).filter(([id]) => id !== 'student')
    .map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
  return intro('Meet the Guidance Personnel', 'University Guidance Center, UPHSD DALTA &mdash; Calamba Campus') +
    `<div class="directory-controls panel">
      ${field('Search staff', 'directory-search', '<input id="directory-search" type="search" placeholder="Name, role, cluster, or email">')}
      ${field('Filter by role', 'directory-role', `<select id="directory-role"><option value="">All roles</option>${roleOptions}</select>`)}
      <p id="directory-count" role="status">${personnel.length} team members</p>
    </div>
    <p id="directory-empty" class="empty" hidden>No team members match. Try another search or choose a different role.</p>
    <div class="team-grid directory-grid">${personnel.map(person => `<article class="person" data-person="${person.id}">
      <div class="portrait"><img src="${person.id}.webp" alt="" loading="lazy"></div>
      <div class="directory-bio"><h3>${person.name}</h3><div class="role">${person.role}</div><p>${person.cluster}</p></div>
      <div class="directory-contact">
        <a class="workflow-email" href="mailto:${person.email}">${person.email}</a>
        <button class="directory-copy" type="button" data-copy-email="${person.id}" aria-label="Copy email for ${person.name}">Copy email</button>
      </div>
      <div class="directory-actions">
        <a class="btn light" href="#messages/${person.id}">Message</a>
        <a class="btn outline" href="#appointments/${person.id}">Schedule a visit</a>
      </div>
    </article>`).join('')}</div>`;
}

function updateDirectory() {
  const query = content.querySelector('#directory-search').value;
  const role = content.querySelector('#directory-role').value;
  let count = 0;
  content.querySelectorAll('[data-person]').forEach(card => {
    card.hidden = !matchesPersonnel(selectedPerson(card.dataset.person), query, role);
    if (!card.hidden) count++;
  });
  content.querySelector('#directory-count').textContent = count === 1 ? '1 team member' : `${count} team members`;
  content.querySelector('#directory-empty').hidden = count > 0;
}

function canManage(visit) {
  return state.role !== 'student' && (state.role !== 'psychometrician' || visit.service === 'Psychological testing');
}

function canSeeVisit(visit) {
  return state.role !== 'psychometrician' || visit.service === 'Psychological testing';
}

function canSeeReferral(referral) {
  return referral.role === state.role || (state.role !== 'student' && canSeeVisit(referral));
}

function shiftSixMonths(value) {
  const local = new Date(value + 8 * 60 * minute);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return local.getTime() - 8 * 60 * minute;
}

const openingTime = '08:00';
const closingTime = '18:00';
const timeOptions = Array.from({ length: 41 }, (_, index) => {
  const minutes = 8 * 60 + index * 15;
  const hour = Math.floor(minutes / 60);
  const minuteText = String(minutes % 60).padStart(2, '0');
  const value = String(hour).padStart(2, '0') + ':' + minuteText;
  return `<option value="${value}">${hour % 12 || 12}:${minuteText} ${hour < 12 ? 'AM' : 'PM'}</option>`;
}).join('');

function isOfficeTime(time) {
  return /^\d{2}:(00|15|30|45)$/.test(time) && time >= openingTime && time <= closingTime;
}

function visitDateFields(prefix, label, minimum, date = '') {
  return `<div class="visit-date-fields">
    ${field(label, prefix + '-date', `<input id="${prefix}-date" type="date" min="${minimum}" value="${date}" required>`)}
    ${field('Time (PHT)', prefix + '-time', select(prefix + '-time', timeOptions, 'Choose a time'))}
  </div><p class="office-hours">Appointment hours are 8:00 AM to 6:00 PM Philippine time.</p>`;
}

function visitForm(walkIn) {
  const now = Date.now();
  return `<form id="visit-form" class="workflow-form" data-kind="${walkIn ? 'walk-in' : 'appointment'}">
    ${field('Service', 'service', select('service', serviceOptions, 'Choose a service'))}
    ${field('Guidance personnel', 'personnel', select('personnel', staffOptions, 'Choose a team member'))}
    ${walkIn ? '' : visitDateFields('scheduled', 'Appointment date', asInput(now).slice(0, 10))}
    <button class="btn maroon" type="submit">${walkIn ? 'Record walk-in' : 'Schedule appointment'}</button>
  </form>`;
}

function upcomingReminder(visit, now) {
  return visit.kind === 'appointment' && visit.status === 'Scheduled' &&
    now >= visit.scheduled - 10 * minute && now < visit.scheduled &&
    visit.dismissedDay !== asInput(now).slice(0, 10) && now >= (visit.snoozedUntil ?? 0);
}

function reminderControls(visit) {
  const remaining = Math.max(1, Math.ceil((visit.scheduled - Date.now()) / minute));
  return `<div class="appointment-reminder" role="status">Starts in ${remaining} min
    <button type="button" class="btn light" data-action="snooze" data-id="${visit.id}">Snooze 5 min</button>
    <button type="button" class="btn outline" data-action="not-today" data-id="${visit.id}">Not today</button></div>`;
}

function visitCard(visit) {
  const now = Date.now();
  const actions = [];
  if (canManage(visit)) {
    if (visit.status === 'Scheduled' || visit.status === 'Waiting') actions.push(['start', 'Mark ongoing']);
    if (visit.status === 'Ongoing') actions.push(['complete', 'Complete visit']);
    if (visit.status === 'Completed' && !visit.returnAt) actions.push(['return', 'Schedule six-month return']);
  }
  return `<article class="visit-card">
    <div class="visit-heading"><h3>${visit.service}</h3><span class="visit-status">${visit.status}</span></div>
    <p>${visit.kind === 'walk-in' ? 'Walk-in' : visit.followUpOf ? 'Return visit' : 'Appointment'} &middot; ${selectedPerson(visit.person).name}</p>
    <dl class="visit-times">
      <div><dt>${visit.kind === 'walk-in' ? 'Checked in' : 'Scheduled for'}</dt><dd>${timestamp(visit.scheduled)}</dd></div>
      <div><dt>Recorded</dt><dd>${timestamp(visit.createdAt)}</dd></div>
      ${visit.startedAt ? `<div><dt>Started</dt><dd>${timestamp(visit.startedAt)}</dd></div>` : ''}
      ${visit.completedAt ? `<div><dt>Completed</dt><dd>${timestamp(visit.completedAt)}</dd></div>` : ''}
      ${visit.returnAt ? `<div><dt>Return visit</dt><dd>${timestamp(visit.returnAt)}</dd></div>` : ''}
    </dl>
    <div class="reminder-slot" data-reminder-id="${visit.id}">${upcomingReminder(visit, now) ? reminderControls(visit) : ''}</div>
    <div class="workflow-actions">${actions.map(([action, label]) => `<button type="button" class="btn light" data-action="${action}" data-id="${visit.id}">${label}</button>`).join('')}</div>
  </article>`;
}

function visitsList(visits) {
  return visits.length ? visits.map(visitCard).join('') : '<p class="empty">No visits to show.</p>';
}

function appointments() {
  return intro('Appointments', 'Schedule a visit in Philippine time. Reminders appear here within 10 minutes of the start time while GuideTrack is open.') +
    `<div class="two-col"><section class="panel"><h2 class="section-title">Schedule a visit</h2><p><a class="workflow-link" href="scheduling.html">Request an appointment with published staff availability</a></p>
    ${previewNote()}${visitForm(false)}</section><section class="panel"><div class="calendar-list-heading"><h2 class="section-title">Scheduled visits</h2><a class="workflow-link" href="#calendar">Open calendar</a></div>
    ${visitsList(state.visits.filter(visit => visit.kind === 'appointment' && canSeeVisit(visit)))}</section></div>`;
}

function walkIns() {
  return intro('Walk-ins', 'Record unscheduled Guidance Center visits and track their progress.') +
    `<div class="two-col"><section class="panel"><h2 class="section-title">Walk-in check-in</h2>${previewNote()}
    ${state.role === 'student' ? '<p>Ask Guidance Center staff to check you in. To try this workflow, choose a staff preview role in the <a class="workflow-link" href="#dashboard">dashboard</a>.</p>' : visitForm(true)}
    </section><section class="panel"><h2 class="section-title">Walk-in queue</h2>${visitsList(state.visits.filter(visit => visit.kind === 'walk-in' && canSeeVisit(visit)))}</section></div>`;
}

function dashboard() {
  const visits = state.visits.filter(canSeeVisit);
  const counts = ['Scheduled', 'Waiting', 'Ongoing', 'Completed'].map(status => [status, visits.filter(visit => visit.status === status).length]);
  const options = Object.entries(roles).map(([id, label]) => `<option value="${id}" ${id === state.role ? 'selected' : ''}>${label}</option>`).join('');
  return intro('Dashboard', 'View appointments, walk-ins, and visit progress for the selected preview role.') +
    `<section class="panel role-panel">${field('Preview role', 'role', `<select id="role">${options}</select>`)}
    <p class="subtitle">Students schedule visits. Staff advance visits and arrange follow-ups. The psychometrician view shows psychological testing visits.</p></section>
    <section class="grid four workflow-metrics" aria-label="Visit analytics">${counts.map(([status, count]) => `<article class="panel"><h2>${status}</h2><strong>${count}</strong></article>`).join('')}</section>
    <div class="two-col workflow-summary"><section class="panel"><h2 class="section-title">Visits by service</h2><dl class="workflow-counts">${services.map(service => `<div><dt>${service}</dt><dd>${visits.filter(visit => visit.service === service).length}</dd></div>`).join('')}</dl></section>
    <section class="panel"><h2 class="section-title">Activity</h2><dl class="workflow-counts"><div><dt>Walk-ins</dt><dd>${visits.filter(visit => visit.kind === 'walk-in').length}</dd></div><div><dt>Messages</dt><dd>${state.messages.filter(message => message.role === state.role).length}</dd></div><div><dt>Referrals</dt><dd>${state.referrals.filter(canSeeReferral).length}</dd></div><div><dt>Return visits</dt><dd>${visits.filter(visit => visit.returnAt).length}</dd></div></dl></section></div>
    <section class="panel"><h2 class="section-title">Visit activity</h2>${visitsList(visits)}</section>`;
}

function messages() {
  const inbox = state.messages.filter(message => message.role === state.role);
  return intro('Messaging', 'Choose a member of the Guidance Center. Preview messages appear in this workspace.') +
    `<div class="two-col"><section class="panel"><h2 class="section-title">New message</h2>${previewNote()}
    <form class="workflow-form" id="message-form">
      ${field('To', 'recipient', select('recipient', staffOptions, 'Choose a team member'))}
      ${field('Message', 'message', '<textarea id="message" maxlength="1000" required></textarea>')}
      <button class="btn maroon" type="submit">Add preview message</button>
    </form></section><section class="panel"><h2 class="section-title">Messages</h2>
    ${inbox.length ? inbox.map(message => `<article class="visit-card">
      <h3>${message.from ? 'From ' + message.from : 'To ' + selectedPerson(message.person).name}</h3><p>${timestamp(message.time)}</p><p class="workflow-message">${escapeText(message.body)}</p>
    </article>`).join('') : '<p class="empty">No messages yet.</p>'}</section></div>`;
}

function referrals() {
  const referrals = state.referrals.filter(canSeeReferral);
  return intro('Referral form', 'Record a referral to the University Guidance Center.') +
    `<div class="two-col"><section class="panel"><h2 class="section-title">New referral</h2>${previewNote()}
    <form class="workflow-form" id="referral-form">
      ${field('Referral type', 'referral-type', select('referral-type', '<option>Self-referral</option><option>Referral for someone else</option>', 'Choose a type'))}
      ${field('Student reference', 'student-reference', '<input id="student-reference" maxlength="80" placeholder="Sample student or ID" required>')}
      ${field('Service', 'referral-service', select('referral-service', serviceOptions, 'Choose a service'))}
      ${field('Reason for referral', 'referral-reason', '<textarea id="referral-reason" maxlength="1000" required></textarea>')}
      <button class="btn maroon" type="submit">Record preview referral</button>
    </form></section><section class="panel"><h2 class="section-title">Referral activity</h2>
    ${referrals.length ? referrals.map(referral => `<article class="visit-card"><h3>${escapeText(referral.reference)}</h3>
      <p>${referral.type} &middot; ${referral.service}</p><p>${timestamp(referral.time)}</p><p class="workflow-message">${escapeText(referral.reason)}</p></article>`).join('') : '<p class="empty">No referrals yet.</p>'}</section></div>`;
}

function resources() {
  return intro('Helpful resources', 'Find guidance and student support for the campus community.') +
    `<div class="resources">
      <article class="resource"><h3>Appointment guidance</h3><p>Select a service, a staff member, and a preferred time.</p><a class="btn light" href="#appointments">View appointments</a></article>
      <article class="resource"><h3>Student support</h3><p>Find a guidance team member and their university email address.</p><a class="btn light" href="#guidance">Meet the team</a></article>
      <article class="resource"><h3>Referrals</h3><p>Use the referral form to try the Guidance Center intake workflow.</p><a class="btn light" href="#referrals">View referral form</a></article>
    </div>`;
}

const wellbeingTopics = [
  ['stress', 'Academic stress and time management', 'Choose one priority for today. Break it into a small first step and make time for a short break.'],
  ['sleep', 'Sleep and daily routines', 'Try a consistent wake-up time, regular meals, and a quiet wind-down routine.'],
  ['connection', 'Belonging and social connection', 'Choose a low-pressure way to connect, such as checking in with a classmate or joining a campus activity.'],
  ['friend', 'Helping a friend', 'Ask how they are doing, listen without judgment, and offer to help them contact a trusted person or counselor.'],
];

function wellbeing(section) {
  return intro('Student Well-being', 'Find self-help resources, prepare for a guidance visit, and learn how to connect with support.') + `
    <div class="two-col wellbeing-grid">
      <section class="panel">
        <h2 class="section-title">Find the right support</h2>
        <div class="wellbeing-options">
          <a class="btn maroon" href="#appointments">Explore appointments</a>
          <a class="btn light" href="#guidance">Contact Guidance Personnel</a>
          <a class="btn light" href="#referrals">Explore referrals</a>
          <a class="btn outline" href="#wellbeing/urgent">Urgent support</a>
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title">Prepare for a guidance visit</h2>
        <ul class="wellbeing-checklist">
          <li><label><input type="checkbox"> Think of one thing you want support with.</label></li>
          <li><label><input type="checkbox"> Decide what questions you want to ask.</label></li>
          <li><label><input type="checkbox"> Check your schedule for a time you can meet.</label></li>
        </ul>
      </section>
      <section class="panel">
        <h2 class="section-title">Self-help library</h2>
        ${wellbeingTopics.map(([id, title, summary]) => `<details ${section === id ? 'open' : ''}><summary>${title}</summary>
          <p>${summary}</p></details>`).join('')}
      </section>
      <section class="panel">
        <h2 class="section-title">Workshops and group support</h2>
        <p>Ask the Guidance Center about availability for these topics.</p>
        <ul><li>Managing exam stress</li><li>Adjusting to university life</li><li>Building healthy relationships</li><li>Career exploration and decision-making</li></ul>
        <a class="btn light" href="#guidance">Find a team member to ask</a>
      </section>
      <section class="panel">
        <h2 class="section-title">Frequently asked questions</h2>
        <details><summary>Do I need to know what is wrong before asking for support?</summary><p>You can reach out even if you are unsure what you need. Start by sharing what has been difficult or what you would like help with.</p></details>
        <details><summary>Can I ask about privacy before a guidance visit?</summary><p>Yes. Ask the counselor how records are handled and what exceptions may apply before sharing sensitive information.</p></details>
        <details><summary>How do I ask about psychological testing?</summary><p>Choose Psychological testing in Appointments or ask the Guidance Center psychometrician about eligibility and available assessments.</p></details>
      </section>
      <section class="panel wellbeing-urgent" aria-labelledby="urgent-heading">
        <h2 id="urgent-heading" class="section-title">Urgent support</h2>
        <p>If you or someone else may be in immediate danger, contact local emergency services or go to the nearest emergency department now. If you can, contact a trusted person who can stay with you.</p>
        <p>The well-being chat is for general information. If you need personal support, speak with a counselor or health professional.</p>
      </section>
    </div>`;
}

const calendarMonthLabel = new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const calendarDayLabel = new Intl.DateTimeFormat('en-PH', { timeZone: 'UTC', dateStyle: 'full' });
const calendarTimeLabel = new Intl.DateTimeFormat('en-PH', { timeZone, timeStyle: 'short' });
const calendarStatuses = ['Scheduled', 'Waiting', 'Ongoing', 'Completed'];
const calendarKinds = { appointment: 'Appointments', 'walk-in': 'Walk-ins', 'follow-up': 'Return visits' };
const calendarDate = value => new Date(value + 'T00:00:00Z');
const dateKey = date => date.toISOString().slice(0, 10);
const monthKey = date => dateKey(date).slice(0, 7);
const visitDay = visit => asInput(visit.scheduled).slice(0, 10);
const visitKind = visit => visit.followUpOf ? 'follow-up' : visit.kind;

function calendarGridDays(month) {
  const first = calendarDate(month + '-01');
  first.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index);
    return date;
  });
}

function calendarVisits(filters) {
  return state.visits.filter(visit => canSeeVisit(visit) &&
    (!filters.staff || visit.person === filters.staff) &&
    (!filters.status || visit.status === filters.status) &&
    (!filters.kind || visitKind(visit) === filters.kind))
    .sort((a, b) => a.scheduled - b.scheduled);
}

function calendarFilter(id, label, options, selected) {
  return field(label, id, `<select id="${id}" data-calendar-filter><option value="">All ${label.toLowerCase()}</option>
    ${options.map(([value, text]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${text}</option>`).join('')}</select>`);
}

function calendar() {
  const filters = state.calendar;
  const today = asInput(Date.now()).slice(0, 10);
  filters.month ||= today.slice(0, 7);
  filters.day ||= today;
  const visits = calendarVisits(filters);
  const byDay = new Map();
  for (const visit of visits) {
    const key = visitDay(visit);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(visit);
  }
  const activeMonth = visits.filter(visit => visitDay(visit).startsWith(filters.month + '-'));
  const selected = byDay.get(filters.day) ?? [];
  const monthLabel = calendarMonthLabel.format(calendarDate(filters.month + '-01'));
  return intro('Guidance calendar', 'See scheduled appointments, walk-ins, and return visits in Philippine time. The calendar updates as you work in this preview.') +
    `<div class="calendar-overview" aria-label="Visible visit totals for this month">
      ${calendarStatuses.map(status => `<div class="calendar-total"><span>${status}</span><strong>${activeMonth.filter(visit => visit.status === status).length}</strong></div>`).join('')}
    </div>
    <section class="panel calendar-panel" aria-label="Monthly calendar">
      <div class="calendar-toolbar">
        <h2 class="section-title" aria-live="polite">${monthLabel}</h2>
        <div class="calendar-nav">
          <button class="btn outline" type="button" data-calendar-move="previous" aria-label="Previous month">&larr;</button>
          <button class="btn light" type="button" data-calendar-move="today">Today</button>
          <button class="btn outline" type="button" data-calendar-move="next" aria-label="Next month">&rarr;</button>
        </div>
        <a class="btn maroon" href="#appointments">Schedule a visit</a>
      </div>
      <div class="calendar-filters">
        ${calendarFilter('calendar-staff', 'Staff', personnel.map(({id, name}) => [id, name]), filters.staff)}
        ${calendarFilter('calendar-status', 'Statuses', calendarStatuses.map(status => [status, status]), filters.status)}
        ${calendarFilter('calendar-kind', 'Types', Object.entries(calendarKinds), filters.kind)}
      </div>
      <div class="calendar-grid">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span class="calendar-weekday" aria-hidden="true">${day}</span>`).join('')}
        ${calendarGridDays(filters.month).map(date => {
          const key = dateKey(date);
          const events = byDay.get(key) ?? [];
          return `<button type="button" class="calendar-day${monthKey(date) === filters.month ? '' : ' calendar-outside'}" data-calendar-day="${key}"
            aria-pressed="${key === filters.day}" ${key === today ? 'aria-current="date"' : ''}
            aria-label="${calendarDayLabel.format(date)}, ${events.length} ${events.length === 1 ? 'visit' : 'visits'}">
            <span class="calendar-day-number">${date.getUTCDate()}</span>
            ${events.length ? `<span class="calendar-day-count">${events.length}</span>` : ''}
            ${events.slice(0, 2).map(visit => `<span class="calendar-event" data-status="${visit.status}">${calendarTimeLabel.format(visit.scheduled)} &middot; ${visit.status}</span>`).join('')}
            ${events.length > 2 ? `<span class="calendar-event calendar-more">+${events.length - 2} more</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </section>
    <section class="panel calendar-agenda" aria-label="Selected day agenda">
      <h2 class="section-title">${calendarDayLabel.format(calendarDate(filters.day))}</h2>
      ${selected.length ? visitsList(selected) : '<p class="empty">No visits match the filters for this date.</p>'}
    </section>`;
}

const pages = { home, dashboard, appointments, calendar, 'walk-in': walkIns, guidance, messages, referrals, resources, wellbeing };

function render(scroll = true) {
  const [route, personId] = location.hash.slice(1).split('/');
  const page = Object.hasOwn(pages, route) ? route : 'home';
  document.querySelector('#crumb').textContent = titles[page];
  document.querySelectorAll('#nav a').forEach(link => {
    const current = link.dataset.page === page;
    link.classList.toggle('active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  content.innerHTML = page === 'wellbeing' ? wellbeing(personId) : pages[page]();
  if (page === 'messages' && selectedPerson(personId)) content.querySelector('#recipient').value = personId;
  if (page === 'appointments' && selectedPerson(personId)) {
    content.querySelector('#personnel').value = personId;
    if (personId === 'guevarra') content.querySelector('#service').value = 'Psychological testing';
  }
  if (scroll) {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('#menu').setAttribute('aria-expanded', 'false');
    if (page === 'wellbeing' && personId === 'urgent') {
      content.querySelector('.wellbeing-urgent').scrollIntoView();
      document.querySelector('#awareness-chat').open = false;
    } else window.scrollTo(0, 0);
  }
}

function addVisit(kind, service, person, scheduled, now, followUpOf = null) {
  state.visits.unshift({ id: state.nextId++, kind, service, person, scheduled, createdAt: now, followUpOf, status: kind === 'walk-in' ? 'Waiting' : 'Scheduled' });
}

content.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const value = id => form.querySelector('#' + id).value;
  const now = Date.now();
  if (form.id === 'visit-form') {
    const kind = form.dataset.kind;
    const service = value('service');
    if (kind === 'walk-in' && !canManage({ service })) {
      toast('Choose a service supported by this staff preview role.');
      return;
    }
    const time = kind === 'walk-in' ? '' : value('scheduled-time');
    if (kind !== 'walk-in' && !isOfficeTime(time)) {
      toast('Choose a time between 8:00 AM and 6:00 PM PHT.');
      return;
    }
    const scheduled = kind === 'walk-in' ? now : fromInput(value('scheduled-date') + 'T' + time);
    if (!Number.isFinite(scheduled) || (kind !== 'walk-in' && scheduled < now + 10 * minute)) {
      toast('Choose an appointment time at least 10 minutes from now.');
      return;
    }
    addVisit(kind, service, value('personnel'), scheduled, now);
    toast(kind === 'walk-in' ? 'Walk-in recorded.' : 'Preview appointment scheduled.');
  } else if (form.id === 'return-form') {
    const visit = state.visits.find(item => item.id === Number(form.dataset.id));
    const time = value('return-time');
    const scheduled = fromInput(value('return-date') + 'T' + time);
    if (!visit || !canManage(visit) || visit.status !== 'Completed' || visit.returnAt) return;
    if (!isOfficeTime(time)) {
      toast('Choose a return time between 8:00 AM and 6:00 PM PHT.');
      return;
    }
    if (!Number.isFinite(scheduled) || scheduled < Math.max(now + 10 * minute, shiftSixMonths(visit.completedAt))) {
      toast('Choose a return time at least six months after the completed visit and 10 minutes from now.');
      return;
    }
    visit.returnAt = scheduled;
    const service = visit.service === 'Psychological testing' ? visit.service : 'Follow-up consultation';
    addVisit('appointment', service, visit.person, scheduled, now, visit.id);
    const notice = { from: 'University Guidance Center', time: now, body: 'Your return visit is scheduled for ' + timestamp(scheduled) + '.' };
    state.messages.unshift({ ...notice, role: 'student' }, { ...notice, role: state.role });
    toast('Return appointment and preview notice created.');
  } else if (form.id === 'message-form') {
    const body = value('message').trim();
    if (!body) return;
    const person = value('recipient');
    const message = { person, body, time: now };
    state.messages.unshift({ ...message, role: state.role });
    if (staffRoles[person] !== state.role) {
      state.messages.unshift({ ...message, from: roles[state.role], role: staffRoles[person] });
    }
    toast('Preview message added.');
  } else if (form.id === 'referral-form') {
    const reference = value('student-reference').trim();
    const reason = value('referral-reason').trim();
    if (!reference || !reason) return;
    state.referrals.unshift({ reference, reason, service: value('referral-service'), type: value('referral-type'), time: now, role: state.role });
    toast('Preview referral recorded.');
  } else return;
  render(false);
});

content.addEventListener('input', event => {
  if (event.target.id === 'directory-search') updateDirectory();
});

content.addEventListener('change', event => {
  if (Object.hasOwn(event.target.dataset, 'calendarFilter')) {
    const { id, value } = event.target;
    state.calendar[id.slice('calendar-'.length)] = value;
    render(false);
    content.querySelector('#' + id).focus();
    return;
  }
  if (event.target.id === 'directory-role') {
    updateDirectory();
    return;
  }
  if (event.target.id !== 'role') return;
  state.role = event.target.value;
  render(false);
  content.querySelector('#role').focus();
});

content.addEventListener('click', async event => {
  const dayButton = event.target.closest('[data-calendar-day]');
  if (dayButton) {
    const day = dayButton.dataset.calendarDay;
    state.calendar.day = day;
    state.calendar.month = day.slice(0, 7);
    render(false);
    content.querySelector(`[data-calendar-day="${day}"]`)?.focus();
    return;
  }
  const calendarButton = event.target.closest('[data-calendar-move]');
  if (calendarButton) {
    const move = calendarButton.dataset.calendarMove;
    if (move === 'today') {
      state.calendar.day = asInput(Date.now()).slice(0, 10);
      state.calendar.month = state.calendar.day.slice(0, 7);
    } else {
      const month = calendarDate(state.calendar.month + '-01');
      month.setUTCMonth(month.getUTCMonth() + (move === 'next' ? 1 : -1));
      state.calendar.month = monthKey(month);
      state.calendar.day = dateKey(month);
    }
    render(false);
    content.querySelector(`[data-calendar-move="${move}"]`)?.focus();
    return;
  }
  const copy = event.target.closest('[data-copy-email]');
  if (copy) {
    try {
      await navigator.clipboard.writeText(selectedPerson(copy.dataset.copyEmail).email);
      toast('Email address copied.');
    } catch {
      toast('Could not copy the email. Select the address or use the email link.');
    }
    return;
  }
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const visit = state.visits.find(item => item.id === Number(button.dataset.id));
  if (!visit) return;
  const now = Date.now();
  const { action } = button.dataset;
  if (action === 'snooze' || action === 'not-today') {
    if (!upcomingReminder(visit, now)) return;
    if (action === 'snooze') {
      visit.snoozedUntil = Math.min(now + 5 * minute, visit.scheduled - minute);
      if (visit.snoozedUntil <= now) visit.snoozedUntil = visit.scheduled;
    } else {
      visit.dismissedDay = asInput(now).slice(0, 10);
    }
    refreshReminders();
    return;
  }
  if (!canManage(visit)) return;
  if (action === 'start' && ['Scheduled', 'Waiting'].includes(visit.status)) {
    visit.status = 'Ongoing';
    visit.startedAt = now;
  } else if (action === 'complete' && visit.status === 'Ongoing') {
    visit.status = 'Completed';
    visit.completedAt = now;
  } else if (action === 'return' && visit.status === 'Completed' && !visit.returnAt) {
    content.querySelector('#return-form')?.remove();
    const minimum = asInput(Math.max(now + 10 * minute, shiftSixMonths(visit.completedAt))).slice(0, 10);
    button.closest('.visit-card').insertAdjacentHTML('beforeend', `<form id="return-form" data-id="${visit.id}" class="workflow-form">
      ${visitDateFields('return', 'Return date', minimum, minimum)}
      <button class="btn maroon" type="submit">Confirm return date</button>
    </form>`);
    content.querySelector('#return-date').focus();
    return;
  }
  render(false);
});

function refreshReminders() {
  const now = Date.now();
  content.querySelectorAll('[data-reminder-id]').forEach(slot => {
    const visit = state.visits.find(item => item.id === Number(slot.dataset.reminderId));
    const next = upcomingReminder(visit, now) ? reminderControls(visit) : '';
    if (slot.dataset.markup !== next) {
      slot.innerHTML = next;
      slot.dataset.markup = next;
    }
  });
}

document.querySelector('.portal-skip').addEventListener('click', event => {
  event.preventDefault();
  content.focus();
  content.scrollIntoView();
});
window.addEventListener('hashchange', () => render());
document.querySelector('#menu').addEventListener('click', event => {
  const open = document.querySelector('.sidebar').classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
setInterval(refreshReminders, 15000);
render();
