const routes = [
  ['Overview', '/#home', 'Portal'], ['Dashboard', '/#dashboard', 'Portal'],
  ['Guidance Personnel', '/#guidance', 'Find a counselor or staff email'],
  ['Live scheduling', '/scheduling.html', 'Request a real appointment or self-referral'],
  ['Preview calendar', '/#calendar', 'Explore appointment workflows with sample visits'],
  ['Student Well-being', '/#wellbeing', 'Self-help and workshop topics'],
  ['Urgent support', '/#wellbeing/urgent', 'Find urgent help'],
  ['Student Toolkit', '/toolkit.html', 'Study plans, checklists, routines, and focus timer'],
  ['Resources', '/#resources', 'Guidance and campus resources'],
];
const searchDialog = document.querySelector('#portal-search');
const searchOpener = document.querySelector('#portal-search-open');
const searchInput = document.querySelector('#portal-query');
const preferences = document.querySelector('#portal-preferences');
const preferencesKey = 'guidetrack-display-preferences';

function showResults() {
  const terms = searchInput.value.trim().toLowerCase().split(/\s+/);
  const results = routes.filter(([title,, description]) => terms.every(term => (title + ' ' + description).toLowerCase().includes(term)));
  document.querySelector('#portal-results').innerHTML = results.length
    ? results.map(([title, href, description]) => `<a href="${href}"><strong>${title}</strong><span>${description}</span></a>`).join('')
    : '<p>No pages match. Try calendar, support, or toolkit.</p>';
}

function openSearch() {
  if (searchDialog.open) return;
  showResults();
  searchDialog.showModal();
  searchInput.focus();
}
searchOpener.addEventListener('click', openSearch);
searchInput.addEventListener('input', showResults);
searchDialog.addEventListener('close', () => searchOpener.focus());
searchDialog.querySelector('#portal-results').addEventListener('click', event => {
  if (event.target.closest('a')) searchDialog.close();
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !preferences.open) {
    event.preventDefault();
    openSearch();
  }
  if (event.target === searchInput && event.key === 'Enter') {
    searchDialog.querySelector('#portal-results a')?.click();
  }
});

let config;
try { config = JSON.parse(localStorage.getItem(preferencesKey) || '{}') || {}; } catch { config = {}; }
const options = ['contrast', 'large-text', 'quiet-motion'];

function applyPreferences() {
  for (const option of options) {
    const active = config[option] === true;
    preferences.querySelector(`[name="${option}"]`).checked = active;
    document.body.classList.toggle('portal-' + option, active);
  }
}

function savePreferences() {
  try { localStorage.setItem(preferencesKey, JSON.stringify(config)); } catch {}
  applyPreferences();
}
document.querySelector('#portal-preferences-open').addEventListener('click', () => preferences.showModal());
preferences.addEventListener('change', event => {
  if (!options.includes(event.target.name)) return;
  config[event.target.name] = event.target.checked;
  savePreferences();
});
document.querySelector('#portal-preferences-reset').addEventListener('click', () => {
  config = {};
  savePreferences();
});
applyPreferences();
