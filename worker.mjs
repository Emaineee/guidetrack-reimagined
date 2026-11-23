const cookieName = '__Host-guidetrack';
const publicPaths = new Set(['/login.html', '/signup.html', '/auth.css', '/auth.js', '/styles.css', '/guidance-logo.png']);
const cookieAttributes = 'Path=/; HttpOnly; Secure; SameSite=Lax';

function redirect(path, cookie) {
  const headers = new Headers({ Location: path, 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

async function api(env, path, options) {
  const base = new URL(env.GUIDETRACK_API_URL);
  if (base.protocol !== 'https:') throw new Error('GuideTrack API must use HTTPS');
  return fetch(base.href.replace(/\/$/, '') + path, {
    ...options, redirect: 'error', cache: 'no-store',
  });
}

async function account(request, env, signup) {
  const page = signup ? '/signup.html' : '/login.html';
  try {
    const fields = await request.formData();
    const read = key => String(fields.get(key) ?? '');
    const email = read('email').trim();
    const password = read('password');
    const body = { email, password };
    if (!email || !password || email.length > 254 || password.length > 256) return redirect(page + '?error=invalid');
    if (signup) {
      const firstName = read('first-name').trim();
      const lastName = read('last-name').trim();
      if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 ||
          password.length < 8 || password !== read('confirm-password')) return redirect(page + '?error=invalid');
      Object.assign(body, { firstName, lastName, role: 'STUDENT' });
    }
    const response = await api(env, signup ? '/auth/register' : '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return redirect(page + (response.status >= 500 ? '?error=unavailable' : '?error=invalid'));
    const { token } = await response.json();
    if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) || token.length > 3500) {
      return redirect(page + '?error=unavailable');
    }
    return redirect('/', `${cookieName}=${token}; ${cookieAttributes}; Max-Age=28800`);
  } catch {
    return redirect(page + '?error=unavailable');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return new Response('Forbidden', { status: 403 });
      if (pathname === '/auth/login') return account(request, env, false);
      if (pathname === '/auth/signup') return account(request, env, true);
      if (pathname === '/auth/logout') return redirect('/login.html', `${cookieName}=; ${cookieAttributes}; Max-Age=0`);
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    if (publicPaths.has(pathname)) return env.ASSETS.fetch(request);

    const token = request.headers.get('Cookie')?.split(';').map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!token) return redirect('/login.html');

    try {
      const session = await api(env, '/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      if (session.status >= 500) throw new Error('GuideTrack API unavailable');
      if (!session.ok) return redirect('/login.html', `${cookieName}=; ${cookieAttributes}; Max-Age=0`);
    } catch {
      return new Response('GuideTrack sign-in is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (pathname === '/') url.pathname = '/index.html';
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  },
};
