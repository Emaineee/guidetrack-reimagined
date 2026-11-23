import { awarenessReply } from './awareness.mjs';
import { activateStaff, canTestStaffView, isStaff, matchesInvitation, openAccount, revokeSession, sessionEmail, validSession } from './accounts.mjs';
import { staff } from './personnel.mjs';
import { scheduling } from './scheduling.mjs';

const cookieName = '__Host-guidetrack';
const publicPaths = new Set(['/login.html', '/signup.html', '/staff-activate.html', '/auth.css', '/auth.js', '/styles.css', '/guidance-logo.png', '/calamba-campus.jpg']);
const cookieAttributes = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const expiredCookie = `${cookieName}=; ${cookieAttributes}; Max-Age=0`;

function redirect(path, cookie) {
  const headers = new Headers({ Location: path, 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function sessionToken(request) {
  const token = request.headers.get('Cookie')?.split(';').map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function unavailable() {
  return new Response('GuideTrack sign-in is temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

async function account(request, env, signup) {
  const page = signup ? '/signup.html' : '/login.html';
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const { success } = await env.AUTH_LIMIT.limit({ key: ip });
    if (!success) return redirect(page + '?error=rate-limit');

    const fields = await request.formData();
    const read = key => String(fields.get(key) ?? '');
    const email = read('email').trim().toLowerCase();
    const password = read('password');
    const firstName = read('first-name').trim();
    const lastName = read('last-name').trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 256) {
      return redirect(page + '?error=invalid');
    }
    if (signup && (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 ||
        password.length < 8 || password !== read('confirm-password'))) return redirect(page + '?error=invalid');

    if (signup && staff.some(person => person.email === email)) return redirect(page + '?error=invalid');
    const token = await openAccount(env.ACCOUNTS, { email, password, firstName, lastName }, signup);
    if (!token) return redirect(page + '?error=invalid');
    return redirect('/', `${cookieName}=${token}; ${cookieAttributes}; Max-Age=28800`);
  } catch (error) {
    console.error('GuideTrack account request failed', error.name);
    return redirect(page + '?error=unavailable');
  }
}

async function staffActivation(request, env) {
  const page = '/staff-activate.html';
  try {
    const { success } = await env.AUTH_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
    if (!success) return redirect(page + '?error=rate-limit');
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const code = String(form.get('code') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const person = staff.find(item => item.email === email);
    if (!person || password.length < 12 || password.length > 256 || password !== form.get('confirm-password')) {
      return redirect(page + '?error=invalid');
    }
    const invited = JSON.parse(env.STAFF_INVITE_HASHES || '{}');
    if (!(await matchesInvitation(code, invited[email]))) return redirect(page + '?error=invalid');
    const token = await activateStaff(env.ACCOUNTS, person, password);
    return token
      ? redirect('/scheduling.html', `${cookieName}=${token}; ${cookieAttributes}; Max-Age=28800`)
      : redirect(page + '?error=invalid');
  } catch {
    return redirect(page + '?error=unavailable');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/api/scheduling' || pathname.startsWith('/api/scheduling/')) {
      if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 });
      try {
        const token = sessionToken(request);
        const email = token && await sessionEmail(env.ACCOUNTS, token);
        if (!email) return new Response(null, { status: 401 });
        return await scheduling(request, env.ACCOUNTS, email, await isStaff(env.ACCOUNTS, email));
      } catch (error) {
        console.error('GuideTrack scheduling failed', error.name);
        return Response.json({ error: 'Scheduling is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return new Response('Forbidden', { status: 403 });
      if (pathname === '/api/awareness') {
        try {
          const token = sessionToken(request);
          if (!token || !(await validSession(env.ACCOUNTS, token))) return new Response(null, { status: 401 });
          const { success } = await env.CHAT_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
          if (!success) return new Response(null, { status: 429 });
          const body = await request.text();
          if (body.length > 12000) return new Response(null, { status: 400 });
          const { message, previousTopic, history } = JSON.parse(body);
          if (typeof message !== 'string' || !message.trim() || message.length > 800) return new Response(null, { status: 400 });
          const answer = await awarenessReply(message.trim(), env.AI, typeof previousTopic === 'string' ? previousTopic : undefined, history);
          return Response.json(answer, { headers: { 'Cache-Control': 'no-store' } });
        } catch (error) {
          return new Response(null, { status: error instanceof SyntaxError ? 400 : 503 });
        }
      }
      if (pathname === '/auth/staff-activate') return staffActivation(request, env);
      if (pathname === '/auth/login') return account(request, env, false);
      if (pathname === '/auth/signup') return account(request, env, true);
      if (pathname === '/auth/logout') {
        const token = sessionToken(request);
        try {
          if (token) await revokeSession(env.ACCOUNTS, token);
          return redirect('/login.html', expiredCookie);
        } catch {
          return unavailable();
        }
      }
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    if (publicPaths.has(pathname)) return env.ASSETS.fetch(request);

    const token = sessionToken(request);
    if (!token) return redirect('/login.html', expiredCookie);
    try {
      if (pathname === '/staff-test') {
        const email = await sessionEmail(env.ACCOUNTS, token);
        if (!email) return redirect('/login.html', expiredCookie);
        if (!(await canTestStaffView(email))) return new Response('Staff test view unavailable.', { status: 403 });
        url.pathname = '/scheduling.html';
      } else if (!(await validSession(env.ACCOUNTS, token))) return redirect('/login.html', expiredCookie);
    } catch {
      return unavailable();
    }
    if (pathname === '/') url.pathname = '/index.html';
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  },
};
