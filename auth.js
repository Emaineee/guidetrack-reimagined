const form = document.querySelector('#auth-form');
const password = document.querySelector('#password');
const confirmation = document.querySelector('#confirm-password');
const status = document.querySelector('#auth-status');

if (confirmation) {
  const validatePasswords = () => {
    const mismatch = confirmation.value && confirmation.value !== password.value;
    confirmation.setCustomValidity(mismatch ? 'Passwords must match.' : '');
  };
  password.addEventListener('input', validatePasswords);
  confirmation.addEventListener('input', validatePasswords);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  form.reset();
  status.textContent = 'Preview complete. No account information was sent or saved.';
  status.hidden = false;
});
