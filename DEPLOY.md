# Deploy Nikita

## API (Cloudflare Workers)
1. Create a new Worker in Cloudflare (or use `wrangler publish`).
2. Secrets:
   - `JWT_SECRET` (32+ bytes)
   - `OPENAI_API_KEY` (optional)
3. KV:
   - `KV_MEMORY` namespace for session memory.
4. Deploy:
   ```bash
   npm run deploy --workspace apps/api
   ```
5. Map route `https://nikita.wokspec.org/*` to the Worker.
6. DNS: add CNAME `nikita` → Worker Pages/route hostname (or A/AAAA via orange cloud if using Workers route).

## Landing / Waitlist Page
1. Host static site via Cloudflare Pages from this repo (or separate minimal landing).
2. Build: `npm run build --workspace apps/web` (or simple static export if using landing only).
3. DNS: CNAME `nikita` → `<project>.pages.dev` if using Pages for the UI.

## Browser Extension
- Build: `npm run build --workspace apps/extension`.
- Submit zips to Chrome/Firefox/Edge stores; keep `PLASMO_PUBLIC_API_URL` pointing at `https://nikita.wokspec.org`.

## Status/Health
- Expose `/health` route on the Worker for monitors.
