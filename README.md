# GuideTrack Reimagined

GuideTrack for UPHSD DALTA Calamba uses a Cloudflare Worker and D1 for registration, session verification, and logout. Login and sign-up are public. Appointment, messaging, referral, and dashboard activity remains a browser preview using sample data.

## Deploy

Deploy as the `guidetrack-reimagined` Worker using `npx wrangler deploy` and Wrangler 4.45.0 or later. The Wrangler configuration requests a D1 database named `guidetrack-accounts`. Wrangler can provision it automatically or connect the existing binding. If the build credentials lack D1 permissions, add the D1 database binding named `ACCOUNTS` with credentials that can deploy it. The Worker initializes the account tables when the first account request reaches D1.

Verify a signed-out visit to `/` redirects to `/login.html`. Verify sign-up, login, and logout after deploying. The previous Render account records are separate from this D1 database.

## Staff activation and live scheduling

Set a Worker secret named `STAFF_INVITE_HASHES` to a JSON object mapping each authorized university email to the SHA-256 hash of that person's invitation code. Each code must be 24 random bytes encoded as 48 hexadecimal characters. Share each code privately with its assigned recipient. At `/staff-activate.html`, they enter the code and choose their own password. Activation consumes the invitation and revokes any existing sessions for that email.

Use **Live scheduling** in the sidebar. Students can request published times or send self-referrals. Verified staff manage their availability and assigned requests there. The separate Calendar, dashboard, and messaging screens still use browser preview records.
