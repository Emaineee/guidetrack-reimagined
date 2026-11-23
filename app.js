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
  home: 'Overview', dashboard: 'Dashboard', appointments: 'Appointments',
  'walk-in': 'Walk-ins', guidance: 'Guidance Personnel', messages: 'Messaging',
  referrals: 'Referrals', resources: 'Resources', wellbeing: 'Student Well-being',
};
const state = { role: 'student', visits: [], messages: [], referrals: [], nextId: 1 };
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
    ['appointments', 'Book an appointment', 'Choose a guidance service and a campus date and time.'],
    ['walk-in', 'Walk-in visits', 'See how the Guidance Center records an unscheduled visit.'],
    ['guidance', 'Meet the Guidance Personnel', 'Find your counselor and the rest of the Guidance Center team.'],
    ['wellbeing', 'Student Well-being', 'Explore self-help tools, group support topics, and how to help a friend.'],
  ];
  return `<section class="hero"><div class="hero-copy">
    <div class="eyebrow">UNIVERSITY GUIDANCE CENTER</div>
    <h1>We care. We listen. We understand.</h1>
    <p>If you need hands to care, ears to listen, and a heart to understand, we are here for you.</p>
    <a class="btn gold" href="#guidance">Meet the Guidance Personnel</a>
  </div></section>
  <div class="grid three">${links.map(([page, title, description]) => `<a class="tile" href="#${page}"><h3>${title}</h3><p>${description}</p></a>`).join('')}</div>`;
}

function guidance() {
  return intro('Meet the Guidance Personnel', 'University Guidance Center, UPHSD DALTA — Calamba Campus') +
    `<div class="team-grid">${personnel.map(person => `<article class="person">
      <div class="portrait"><img src="${person.id}.webp" alt="" loading="lazy"></div>
      <div class="person-body"><h3>${person.name}</h3><div class="role">${person.role}</div>
      <p>${person.cluster}</p><a class="workflow-email" href="mailto:${person.email}">${person.email}</a>
      <a class="btn light" href="#messages/${person.id}">Message</a></div></article>`).join('')}</div>`;
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

function visitForm(walkIn) {
  const now = Date.now();
  return `<form id="visit-form" class="workflow-form" data-kind="${walkIn ? 'walk-in' : 'appointment'}">
    ${field('Service', 'service', select('service', serviceOptions, 'Choose a service'))}
    ${field('Guidance personnel', 'personnel', select('personnel', staffOptions, 'Choose a team member'))}
    ${walkIn ? '' : field('Date and time (PHT)', 'scheduled', `<input id="scheduled" type="datetime-local" min="${asInput(now + 11 * minute)}" required>`)}
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
    <p>${visit.kind === 'walk-in' ? 'Walk-in' : 'Appointment'} &middot; ${selectedPerson(visit.person).name}</p>
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
    `<div class="two-col"><section class="panel"><h2 class="section-title">Schedule a visit</h2>
    ${previewNote()}${visitForm(false)}</section><section class="panel"><h2 class="section-title">Scheduled visits</h2>
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

const pages = { home, dashboard, appointments, 'walk-in': walkIns, guidance, messages, referrals, resources, wellbeing };

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
  if (scroll) {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('#menu').setAttribute('aria-expanded', 'false');
    if (page === 'wellbeing' && personId === 'urgent') {
      content.querySelector('.wellbeing-urgent').scrollIntoView();
      document.querySelector('#awareness-chat').open = false;
    } else window.scrollTo(0, 0);
  }
}

function addVisit(kind, service, person, scheduled, now) {
  state.visits.unshift({ id: state.nextId++, kind, service, person, scheduled, createdAt: now, status: kind === 'walk-in' ? 'Waiting' : 'Scheduled' });
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
    const scheduled = kind === 'walk-in' ? now : fromInput(value('scheduled'));
    if (!Number.isFinite(scheduled) || (kind !== 'walk-in' && scheduled < now + 10 * minute)) {
      toast('Choose an appointment time at least 10 minutes from now.');
      return;
    }
    addVisit(kind, service, value('personnel'), scheduled, now);
    toast(kind === 'walk-in' ? 'Walk-in recorded.' : 'Preview appointment scheduled.');
  } else if (form.id === 'return-form') {
    const visit = state.visits.find(item => item.id === Number(form.dataset.id));
    const scheduled = fromInput(value('return-date'));
    if (!visit || !canManage(visit) || visit.status !== 'Completed' || visit.returnAt) return;
    if (!Number.isFinite(scheduled) || scheduled < Math.max(now + 10 * minute, shiftSixMonths(visit.completedAt))) {
      toast('Choose a return time at least six months after the completed visit and 10 minutes from now.');
      return;
    }
    visit.returnAt = scheduled;
    const service = visit.service === 'Psychological testing' ? visit.service : 'Follow-up consultation';
    addVisit('appointment', service, visit.person, scheduled, now);
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

content.addEventListener('change', event => {
  if (event.target.id !== 'role') return;
  state.role = event.target.value;
  render(false);
  content.querySelector('#role').focus();
});

content.addEventListener('click', event => {
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
    const minimum = asInput(Math.ceil(Math.max(now + 10 * minute, shiftSixMonths(visit.completedAt)) / minute) * minute);
    button.closest('.visit-card').insertAdjacentHTML('beforeend', `<form id="return-form" data-id="${visit.id}" class="workflow-form">
      ${field('Return date and time (PHT)', 'return-date', `<input type="datetime-local" id="return-date" min="${minimum}" value="${minimum}" required>`)}
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

window.addEventListener('hashchange', () => render());
document.querySelector('#menu').addEventListener('click', event => {
  const open = document.querySelector('.sidebar').classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
setInterval(refreshReminders, 15000);
render();
