# GuideTrack Reimagined

GuideTrack for UPHSD DALTA Calamba uses a Cloudflare Worker and D1 for registration, session verification, and logout. Login and sign-up are public. Appointment, messaging, referral, and dashboard activity remains a browser preview using sample data.

## Deploy

Deploy as the `guidetrack-reimagined` Worker using `npx wrangler deploy` and Wrangler 4.45.0 or later. The Wrangler configuration requests a D1 database named `guidetrack-accounts`. Wrangler can provision it automatically or connect the existing binding. If the build credentials lack D1 permissions, add the D1 database binding named `ACCOUNTS` with credentials that can deploy it. The Worker initializes the account tables when the first account request reaches D1.

Verify a signed-out visit to `/` redirects to `/login.html`. Verify sign-up, login, and logout after deploying. The previous Render account records are separate from this D1 database.
