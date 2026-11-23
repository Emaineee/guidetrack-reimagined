const routes = [
  ['Overview', '/#home', 'Portal'], ['Dashboard', '/#dashboard', 'Portal'],
  ['Guidance Personnel', '/#guidance', 'Find a counselor or staff email'],
  ['Live scheduling', '/scheduling.html', 'Request a real appointment or self-referral'],
  ['Preview calendar', '/#calendar', 'Explore appointment workflows with sample visits'],
  ['Student Well-being', '/#wellbeing', 'Self-help and workshop topics'],
  ['Urgent support', '/#wellbeing/urgent', 'Find urgent help'],
  ['My requests', '/scheduling.html#my-requests', 'Track appointment and referral status'],
  ['Settings', '/settings.html', 'Display, text size, and motion preferences'],
  ['Resources', '/#resources', 'Guidance and campus resources'],
];
const searchDialog = document.querySelector('#portal-search');
const searchOpener = document.querySelector('#portal-search-open');
const searchInput = document.querySelector('#portal-query');

function showResults() {
  const terms = searchInput.value.trim().toLowerCase().split(/\s+/);
  const results = routes.filter(([title,, description]) => terms.every(term => (title + ' ' + description).toLowerCase().includes(term)));
  document.querySelector('#portal-results').innerHTML = results.length
    ? results.map(([title, href, description]) => `<a href="${href}"><strong>${title}</strong><span>${description}</span></a>`).join('')
    : '<p>No pages match. Try calendar, support, or settings.</p>';
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
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (event.target === searchInput && event.key === 'Enter') {
    searchDialog.querySelector('#portal-results a')?.click();
  }
});

const statusOrder = ['Pending', 'Accepted', 'Ongoing', 'Completed'];
async function loadDashboard() {
  const status = document.querySelector('#dashboard-live-status');
  const metrics = document.querySelector('#dashboard-live-metrics');
  if (!status || !metrics) return;
  try {
    const response = await fetch('/api/scheduling');
    if (!response.ok) throw new Error('Unavailable');
    const { requests } = await response.json();
    metrics.replaceChildren(...statusOrder.map(label => {
      const cell = document.createElement('div');
      const title = document.createElement('span');
      const total = document.createElement('strong');
      title.textContent = label;
      total.textContent = requests.filter(item => item.status === label).length;
      cell.append(title, total);
      return cell;
    }));
    status.textContent = requests.length ? 'Your latest appointment and referral activity.' : 'You have no live requests yet.';
  } catch {
    status.textContent = 'The summary is temporarily unavailable. Open Live scheduling to retry.';
  }
}
loadDashboard();
