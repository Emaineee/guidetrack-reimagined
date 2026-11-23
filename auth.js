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

const error = new URLSearchParams(location.search).get('error');
if (error) {
  const activation = location.pathname.endsWith('staff-activate.html');
  const signup = location.pathname.endsWith('signup.html');
  status.textContent = error === 'unavailable'
    ? 'GuideTrack sign-in is temporarily unavailable. Please try again later.'
    : error === 'rate-limit'
      ? 'Too many attempts. Wait a minute and try again.'
      : activation
        ? 'Could not activate staff access. Check your email, invitation code, and matching passwords.'
        : signup
      ? 'Could not create your account. Check your details or log in if you already have an account.'
      : 'Email or password was incorrect.';
  status.hidden = false;
}
