# GuideTrack Reimagined

GuideTrack for UPHSD DALTA Calamba uses a Cloudflare Worker to authenticate visitors before serving the portal. The login and sign-up pages are public. Appointment, messaging, referral, and dashboard activity remains a browser preview using sample data.

## Deploy

Deploy this repository as the `guidetrack-reimagined` Cloudflare Worker using the checked-in `wrangler.toml` (for example, `npx wrangler deploy` from the repository root). If using Workers Builds, connect the repository and use `npx wrangler deploy` as its deploy command. A static-only upload or Pages deployment does not run the authentication gate.

Set `GUIDETRACK_API_URL` to the HTTPS base URL for the GuideTrack API, including its `/api` prefix. The Worker calls `/auth/login`, `/auth/register`, and `/auth/me` on that API. Verify a signed-out request to `/` and `/index.html` redirects to `/login.html` before sharing the live portal URL.
