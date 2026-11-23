# GuideTrack Reimagined — Cloudflare Pages-ready frontend

A new visual frontend based on the GuideTrack/SAPES modules (Overview, Appointments, Concerns, Guidance Center, Resources). The original `Emaineee/sapes` repository is not modified.

## Deploy for free

1. Create a **new GitHub repository** (e.g. `guidetrack-reimagined`).
2. Upload the **contents** of this folder to the repository root.
3. In Cloudflare dashboard choose **Workers & Pages → Create → Pages → Connect to Git**, select the new repository.
4. Use **Framework preset: None**, **Build command: leave empty**, **Build output directory: /** (repository root).
5. Deploy. The `index.html` is at the repository root.

You may also upload the folder directly using Cloudflare Pages Direct Upload.

## Important limitations

This is a **static, responsive design preview**, not a production guidance system. It does not authenticate users, save appointments, submit concerns, or connect to a database. Demo forms deliberately do not transmit or store sensitive student information. The original Express/EJS application and API routes are not yet migrated.

For production, integrate secure server-side authentication, the GuideTrack API, role-based permissions, session handling, database storage, and privacy protections before accepting real student data.

## Attribution and verification

Uses the four staff portraits and Guidance Center logo provided for this project. Please verify each person's name, credentials, title, and cluster with the Guidance Center before publishing.
