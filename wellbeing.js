const chat = document.querySelector('#awareness-chat');
const chatLauncher = chat.querySelector('summary');
const chatLog = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#awareness-form');
const chatInput = document.querySelector('#awareness-message');
const typing = document.querySelector('#chat-typing');
const sendButton = chatForm.querySelector('button');
let previousTopic;
const conversation = [];

function closeChat() {
  chat.open = false;
  chatLauncher.focus();
}

function addChatMessage(author, message, fromUser = false, guide = null) {
  const item = document.createElement('div');
  item.className = fromUser ? 'chat-message chat-message-user' : 'chat-message';
  const label = document.createElement('span');
  label.className = 'chat-author';
  label.textContent = author;
  const bubble = document.createElement('p');
  bubble.textContent = message;
  item.append(label, bubble);
  if (guide?.path?.startsWith('/') && !guide.path.startsWith('//') && typeof guide.label === 'string') {
    const link = document.createElement('a');
    link.className = 'chat-guide-link';
    link.href = guide.path;
    link.textContent = guide.label;
    item.append(link);
  }
  chatLog.append(item);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chat.querySelector('.chat-close').addEventListener('click', closeChat);
chat.addEventListener('keydown', event => {
  if (event.key === 'Escape' && chat.open) {
    event.preventDefault();
    closeChat();
  }
});

chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !sendButton.disabled) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chat.addEventListener('click', event => {
  const suggestion = event.target.closest('[data-prompt]');
  if (suggestion) {
    chatInput.value = suggestion.dataset.prompt;
    chatInput.focus();
    return;
  }
  const link = event.target.closest('.chat-links a, .chat-guide-link');
  if (!link) return;
  closeChat();
  if (link.hash === '#wellbeing/urgent' && location.hash === link.hash) {
    document.querySelector('.wellbeing-urgent')?.scrollIntoView();
  }
});

chatForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message || sendButton.disabled) return;
  addChatMessage('You', message, true);
  chatInput.value = '';
  sendButton.disabled = true;
  typing.hidden = false;
  try {
    const response = await fetch('/api/awareness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, previousTopic, history: conversation }),
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
    const answer = await response.json();
    previousTopic = answer.topic;
    if (answer.topic !== 'unavailable') {
      conversation.push({ role: 'user', content: message.slice(0, 600) },
        { role: 'assistant', content: answer.reply.slice(0, 600) });
      if (conversation.length > 6) conversation.splice(0, conversation.length - 6);
    }
    addChatMessage('GuideTrack', answer.reply, false, answer);
  } catch {
    addChatMessage('GuideTrack', 'The chat is temporarily unavailable. You can still open Student Well-being or contact the Guidance Center.');
  } finally {
    typing.hidden = true;
    sendButton.disabled = false;
  }
});
