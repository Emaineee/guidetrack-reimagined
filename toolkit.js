const localDate = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
const clock = minutes => {
  const value = (minutes + 1440) % 1440;
  const hour = Math.floor(value / 60);
  return `${hour % 12 || 12}:${String(value % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};
const minuteValue = value => value.split(':').reduce((hours, minutes) => hours * 60 + Number(minutes), 0);

const tools = [
  { id: 'focus', name: 'Focus timer', category: 'Study', summary: 'Run a timed study block or short break.', form: '<label for="focus-duration">Duration</label><select name="duration" id="focus-duration"><option value="5">5-minute break</option><option value="15">15 minutes</option><option value="25" selected>25 minutes</option><option value="45">45 minutes</option></select><output class="timer-display" aria-label="Time remaining">25:00</output><div class="workflow-actions"><button class="btn maroon" type="submit">Start</button><button class="btn outline" data-timer="pause" type="button">Pause</button><button class="btn outline" data-timer="reset" type="button">Reset</button></div>' },
  { id: 'study', name: 'Study block planner', category: 'Study', summary: 'Split your available time into focused sessions and breaks.', form: '<label for="study-minutes">Available minutes</label><input name="minutes" id="study-minutes" type="number" min="10" max="480" value="60" required><label for="study-block">Preferred block</label><select name="block" id="study-block"><option>15</option><option selected>25</option><option>40</option></select>', calculate: ({ minutes, block }) => studyPlan(Number(minutes), Number(block)) },
  { id: 'priorities', name: 'Three priorities', category: 'Study', summary: 'Turn competing tasks into a short, ordered checklist.', form: '<label for="priority-first">Must do today</label><input name="first" id="priority-first" maxlength="120" required><label for="priority-second">Should do next</label><input name="second" id="priority-second" maxlength="120"><label for="priority-third">Can wait</label><input name="third" id="priority-third" maxlength="120">', calculate: values => Object.entries(values).filter(([, value]) => value.trim()).map(([key, value]) => (key === 'first' ? 'Start with: ' : key === 'second' ? 'Next: ' : 'Later: ') + value.trim()).join('\n') },
  { id: 'deadline', name: 'Deadline countdown', category: 'Study', summary: 'Find out how many days are left and plan an early checkpoint.', form: () => `<label for="deadline-date">Due date</label><input name="date" id="deadline-date" type="date" min="${localDate()}" required>`, calculate: ({ date }) => deadlinePlan(localDate(), date) },
  { id: 'review', name: 'Review schedule', category: 'Study', summary: 'Set three practice-review dates for a topic.', form: () => `<label for="review-date">Start date</label><input name="date" id="review-date" type="date" value="${localDate()}" required>`, calculate: ({ date }) => [1, 3, 7].map(day => `Day ${day}: ${new Date(Date.parse(date) + day * 86400_000).toISOString().slice(0, 10)}`).join('\n') },
  { id: 'sleep', name: 'Wind-down planner', category: 'Well-being', summary: 'Work backward from bedtime to set a calm evening routine.', form: '<label for="sleep-time">Target bedtime</label><input name="time" id="sleep-time" type="time" value="22:30" required><label for="sleep-prep">Wind-down time</label><select name="prep" id="sleep-prep"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="45">45 minutes</option></select>', calculate: ({ time, prep }) => `Start winding down at ${clock(minuteValue(time) - Number(prep))}. Pick a quiet activity and set aside tomorrow\'s tasks before ${clock(minuteValue(time))}.` },
  { id: 'ground', name: 'Five-senses check-in', category: 'Well-being', summary: 'Try a short grounding exercise at your own pace.', steps: ['Notice five things you can see.', 'Notice four things you can feel.', 'Notice three things you can hear.', 'Notice two things you can smell.', 'Notice one thing you can taste, or one small thing you appreciate.'] },
  { id: 'break', name: 'Choose a reset break', category: 'Well-being', summary: 'Pick a short, manageable pause between tasks.', form: '<label for="break-choice">What feels right?</label><select name="choice" id="break-choice"><option value="move">Move around</option><option value="quiet">A quiet moment</option><option value="connection">Connect with someone</option></select>', calculate: ({ choice }) => ({ move: 'Stand up, stretch gently, or take a short walk if that feels comfortable.', quiet: 'Step away from the screen, sip some water, and look at something in the distance for a moment.', connection: 'Send a brief check-in to a friend or classmate and return to your task when you are ready.' })[choice] },
  { id: 'reach', name: 'Reach-out message starter', category: 'Well-being', summary: 'Get a simple starting point for a conversation.', form: '<label for="reach-person">Who are you contacting?</label><select name="person" id="reach-person"><option value="friend">A friend</option><option value="counselor">A counselor</option><option value="teacher">An instructor</option></select>', calculate: ({ person }) => ({ friend: 'Hi, could we talk sometime today? I have been having a difficult week and would appreciate someone to listen.', counselor: 'Hello, I would like to ask about a guidance consultation. Could you let me know the best way to arrange one?', teacher: 'Hello, could I ask for a brief meeting about keeping up with the course? I would appreciate help choosing a next step.' })[person] },
  { id: 'visit', name: 'Prepare for a visit', category: 'Guidance', summary: 'Use a checklist before meeting a counselor.', steps: ['Think of one topic you want to bring up.', 'Write down a question you want to ask.', 'Check the date, time, and meeting location.', 'Ask the counselor about privacy and any next steps.'], link: ['/scheduling.html', 'Open live scheduling'] },
  { id: 'day', name: 'Appointment-day checklist', category: 'Guidance', summary: 'Make sure you have the details before heading to a visit.', steps: ['Check the appointment status in Live scheduling.', 'Confirm the location and how you will get there.', 'Allow time to arrive or connect.', 'Contact your counselor if your plans change.'], link: ['/scheduling.html', 'Check my requests'] },
  { id: 'arrival', name: 'Leave-on-time calculator', category: 'Guidance', summary: 'Work backward from an appointment to find when to leave.', form: '<label for="arrival-time">Appointment time</label><input id="arrival-time" name="time" type="time" required><label for="arrival-travel">Travel minutes</label><input id="arrival-travel" name="travel" type="number" min="0" max="240" value="30" required><label for="arrival-buffer">Extra minutes</label><input id="arrival-buffer" name="buffer" type="number" min="0" max="90" value="10" required>', calculate: ({ time, travel, buffer }) => {
    const leave = minuteValue(time) - Number(travel) - Number(buffer);
    return 'Aim to leave at ' + clock(leave) + (leave < 0 ? ' the previous day.' : '.');
  } },
  { id: 'group', name: 'Group study checklist', category: 'Study', summary: 'Make the session useful before everyone arrives.', steps: ['Agree on one shared goal.', 'Set a start and finish time.', 'Choose questions to practice.', 'Agree on a next step for each person.'] },
  { id: 'routine', name: 'Build a small habit', category: 'Well-being', summary: 'Connect a manageable habit to something you already do.', form: '<label for="habit-anchor">After I...</label><input id="habit-anchor" name="anchor" maxlength="100" required><label for="habit-next">I will...</label><input id="habit-next" name="next" maxlength="100" required>', calculate: ({ anchor, next }) => 'After I ' + anchor.trim() + ', I will ' + next.trim() + '. Make the first step small enough to do on a busy day.' },
  { id: 'support', name: 'Find the right support', category: 'Guidance', summary: 'Choose a situation and get a starting point in GuideTrack.', form: '<label for="support-need">What do you need?</label><select name="need" id="support-need"><option value="visit">Talk to someone</option><option value="team">Find a staff contact</option><option value="tools">Explore self-help</option><option value="urgent">Get urgent help</option></select>', calculate: ({ need }) => ({ visit: ['Use Live scheduling to request a published appointment time.', '/scheduling.html', 'Open live scheduling'], team: ['Search the Guidance Personnel directory by role, cluster, or name.', '/#guidance', 'Open the directory'], tools: ['Explore student well-being resources and the well-being chat.', '/#wellbeing', 'Open Student Well-being'], urgent: ['If someone may be in immediate danger, contact local emergency services or go to the nearest emergency department now.', '/#wellbeing/urgent', 'Open urgent support'] })[need] },
];

function studyPlan(minutes, block) {
  const plan = [];
  let remaining = minutes;
  while (remaining > 0) {
    const session = Math.min(remaining, block);
    plan.push(`Study for ${session} min`);
    remaining -= session;
    if (remaining > 5) { plan.push('Break for 5 min'); remaining -= 5; }
  }
  return plan.join('\n');
}

function deadlinePlan(today, deadline) {
  const days = Math.round((Date.parse(deadline) - Date.parse(today)) / 86400_000);
  if (days <= 0) return 'Due today. Choose the smallest part you can finish first.';
  return `${days} ${days === 1 ? 'day' : 'days'} left. Start today and aim to have a first draft in ${Math.max(1, Math.floor(days / 2))} ${days < 4 ? 'day' : 'days'}.`;
}

let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('guidetrack-toolkit-favorites') || '[]')); } catch { favorites = new Set(); }
const grid = document.querySelector('#tool-grid');
const search = document.querySelector('#tool-search');
const category = document.querySelector('#tool-category');
const count = document.querySelector('#tool-count');
const favoritesOnly = document.querySelector('#tool-favorites');
const actionStatus = document.createElement('p');
actionStatus.setAttribute('role', 'status');
grid.before(actionStatus);
const clockState = { end: 0, remaining: 25 * 60_000, interval: null };

function card(tool) {
  const fields = typeof tool.form === 'function' ? tool.form() : tool.form;
  return `<article class="panel tool-card" data-tool="${tool.id}">
    <div class="tool-card-heading"><span>${tool.category}</span><button class="tool-save" type="button" data-save="${tool.id}" aria-pressed="${favorites.has(tool.id)}" aria-label="Favorite ${tool.name}">&#9734;</button></div>
    <h2>${tool.name}</h2><p>${tool.summary}</p>
    <details><summary>Open tool</summary>
      ${fields ? `<form class="tool-form" data-calculate="${tool.id}">${fields}${tool.calculate ? '<button class="btn maroon" type="submit">Show plan</button>' : ''}</form>` : ''}
      ${tool.steps ? `<div class="tool-steps">${tool.steps.map(step => `<label><input type="checkbox"> ${step}</label>`).join('')}<output>0 of ${tool.steps.length} complete</output><button type="button" class="btn outline" data-clear-checklist>Reset checklist</button></div>` : ''}
      ${tool.link ? `<a class="workflow-link" href="${tool.link[0]}">${tool.link[1]}</a>` : ''}
      <div class="tool-result" role="status" hidden></div>
      <div class="workflow-actions tool-result-actions" hidden><button type="button" class="btn outline" data-copy-result>Copy</button><button type="button" class="btn outline" data-download-result>Download text</button><button type="button" class="btn outline" data-clear-result>Clear</button></div>
    </details></article>`;
}

function applyFilters() {
  const terms = search.value.trim().toLowerCase().split(/\s+/);
  let total = 0;
  for (const item of grid.querySelectorAll('[data-tool]')) {
    const tool = tools.find(candidate => candidate.id === item.dataset.tool);
    item.hidden = (favoritesOnly.checked && !favorites.has(tool.id)) || Boolean(category.value && category.value !== tool.category) || !terms.every(term => (tool.name + ' ' + tool.summary + ' ' + tool.category).toLowerCase().includes(term));
    if (!item.hidden) total++;
  }
  count.textContent = total ? `${total} ${total === 1 ? 'tool' : 'tools'}` : 'No tools match. Try a different search or clear the filters.';
}

function updateClock() {
  const remaining = clockState.end ? Math.max(0, clockState.end - Date.now()) : clockState.remaining;
  const seconds = Math.ceil(remaining / 1000);
  grid.querySelector('.timer-display').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (clockState.end && !remaining) {
    clockState.end = 0;
    clockState.remaining = 0;
    clearInterval(clockState.interval);
    showResult(grid.querySelector('[data-tool="focus"]'), 'Timer complete. Take a moment before your next task.');
  }
}

function showResult(card, result) {
  const output = card.querySelector('.tool-result');
  output.replaceChildren();
  if (Array.isArray(result)) {
    output.append(document.createTextNode(result[0] + ' '));
    const link = document.createElement('a');
    link.href = result[1]; link.textContent = result[2]; link.className = 'workflow-link';
    output.append(link);
  } else output.textContent = result;
  output.hidden = false;
  card.querySelector('.tool-result-actions').hidden = false;
}

grid.innerHTML = [...tools].sort((a,b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id))).map(card).join('');
applyFilters();
search.addEventListener('input', applyFilters);
category.addEventListener('change', applyFilters);
favoritesOnly.addEventListener('change', applyFilters);
document.querySelector('#tool-clear').addEventListener('click', () => {
  search.value = ''; category.value = ''; favoritesOnly.checked = false; applyFilters(); search.focus();
});
grid.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const tool = tools.find(item => item.id === form.dataset.calculate);
  if (!tool) return;
  const values = Object.fromEntries(new FormData(form));
  if (tool.id === 'focus') {
    if (clockState.end) return;
    if (!clockState.remaining) clockState.remaining = Number(values.duration) * 60_000;
    clockState.end = Date.now() + clockState.remaining;
    form.closest('[data-tool]').querySelectorAll('.tool-result, .tool-result-actions').forEach(item => { item.hidden = true; });
    clockState.interval = setInterval(updateClock, 250);
    updateClock();
  } else showResult(form.closest('[data-tool]'), tool.calculate(values));
});
grid.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'duration' && !clockState.end) {
    clockState.remaining = Number(input.value) * 60_000;
    updateClock();
  }
  if (input.type === 'checkbox') {
    const steps = input.closest('.tool-steps');
    steps.querySelector('output').textContent = `${steps.querySelectorAll(':checked').length} of ${steps.querySelectorAll('input').length} complete`;
  }
});
grid.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const resultCard = button.closest('[data-tool]');
  if (button.hasAttribute('data-copy-result') || button.hasAttribute('data-download-result')) {
    const text = resultCard.querySelector('.tool-result').textContent;
    if (button.hasAttribute('data-copy-result')) {
      try { await navigator.clipboard.writeText(text); actionStatus.textContent = 'Tool result copied.'; }
      catch { actionStatus.textContent = 'Could not copy automatically. You can select the result text or download it.'; }
    } else {
      const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = 'guidetrack-' + resultCard.dataset.tool + '.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      actionStatus.textContent = 'Tool result downloaded.';
    }
  }
  if (button.hasAttribute('data-clear-result')) {
    const output = resultCard.querySelector('.tool-result');
    output.textContent = '';
    output.hidden = true;
    resultCard.querySelector('.tool-result-actions').hidden = true;
  }
  if (button.dataset.save) {
    const id = button.dataset.save;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    button.setAttribute('aria-pressed', String(favorites.has(id)));
    try { localStorage.setItem('guidetrack-toolkit-favorites', JSON.stringify([...favorites])); } catch {}
    applyFilters();
  }
  if (button.dataset.timer) {
    const duration = button.form.elements.duration;
    if (button.dataset.timer === 'pause' && !clockState.end) return;
    clockState.remaining = button.dataset.timer === 'pause' ? Math.max(0, clockState.end - Date.now()) : Number(duration.value) * 60_000;
    clockState.end = 0;
    clearInterval(clockState.interval);
    updateClock();
    button.closest('[data-tool]').querySelectorAll('.tool-result, .tool-result-actions').forEach(item => { item.hidden = true; });
  }
  if (button.hasAttribute('data-clear-checklist')) {
    const checklist = button.closest('.tool-steps');
    checklist.querySelectorAll('input').forEach(input => { input.checked = false; });
    checklist.querySelector('output').textContent = `0 of ${checklist.querySelectorAll('input').length} complete`;
  }
});
