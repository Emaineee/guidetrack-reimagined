const preferencesKey = 'guidetrack-display-preferences';
const displayOptions = ['contrast', 'large-text', 'quiet-motion'];
const displaySettings = document.querySelector('#display-preferences');
let displayConfig;
try { displayConfig = JSON.parse(localStorage.getItem(preferencesKey) || '{}') || {}; } catch { displayConfig = {}; }
if (typeof displayConfig !== 'object' || Array.isArray(displayConfig)) displayConfig = {};

function applyDisplaySettings() {
  for (const option of displayOptions) {
    const active = displayConfig[option] === true;
    if (displaySettings) displaySettings.elements[option].checked = active;
    document.body.classList.toggle('portal-' + option, active);
  }
}

function saveDisplaySettings(message) {
  const feedback = document.querySelector('#settings-feedback');
  try {
    localStorage.setItem(preferencesKey, JSON.stringify(displayConfig));
    feedback.textContent = message;
  } catch {
    feedback.textContent = 'These settings apply until you leave this page.';
  }
  applyDisplaySettings();
}

if (displaySettings) {
  displaySettings.addEventListener('change', event => {
    if (!displayOptions.includes(event.target.name)) return;
    displayConfig[event.target.name] = event.target.checked;
    saveDisplaySettings('Display settings saved.');
  });
  document.querySelector('#settings-reset').addEventListener('click', () => {
    displayConfig = {};
    saveDisplaySettings('Display settings restored.');
  });
}
applyDisplaySettings();
