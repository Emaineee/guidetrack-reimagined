const chat = document.querySelector('#awareness-chat');
const chatLog = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#awareness-form');
const chatInput = document.querySelector('#awareness-message');
const sendButton = chatForm.querySelector('button');

function addChatMessage(author, message) {
  const item = document.createElement('p');
  const label = document.createElement('strong');
  label.textContent = author;
  item.append(label, document.createTextNode(' ' + message));
  chatLog.append(item);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chat.addEventListener('click', event => {
  const link = event.target.closest('a[href="#wellbeing/urgent"]');
  if (!link) return;
  chat.open = false;
  if (location.hash === '#wellbeing/urgent') document.querySelector('.wellbeing-urgent')?.scrollIntoView();
});

chatForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message || sendButton.disabled) return;
  addChatMessage('You', message);
  chatInput.value = '';
  sendButton.disabled = true;
  sendButton.textContent = 'Finding support...';
  try {
    const response = await fetch('/api/awareness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (response.status === 401) {
      addChatMessage('GuideTrack', 'Your session expired. Log in again to use the chat.');
      return;
    }
    if (response.status === 429) {
      addChatMessage('GuideTrack', 'Please wait a minute before trying again.');
      return;
    }
    if (!response.ok) throw new Error('Chat unavailable');
    const { reply } = await response.json();
    addChatMessage('GuideTrack', reply);
  } catch {
    addChatMessage('GuideTrack', 'The chat is temporarily unavailable. You can still open Student Well-being or contact the Guidance Center.');
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
  }
});
