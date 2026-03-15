# Nikita Waitlist Page — Design Brief

Destination: `https://nikita.wokspec.org`

Goal: fast, friendly waitlist capture for the browser extension and API, with a simple pink-led visual identity.

## Visual Direction
- Palette: deep pink (#f56ba8), blush (#ffd9ec), warm off-white (#fff6fb), ink text (#140a12). Limited neutrals; no gradients beyond a subtle top-to-bottom blush wash.
- Typography: single sans family with soft curves (e.g., Space Grotesk or Satoshi). 600 weight for headings, 400–500 for body.
- Layout: narrow column, generous padding, centered hero. Minimum chrome; no heavy cards.
- Imagery: avoid stock photos and emojis. Optional abstract line art in a faint blush stroke behind the hero.
- Accents: pill buttons with light borders; hover state lightens background instead of adding shadows.

## Page Structure
1) **Hero**: short headline (“Your AI layer, everywhere you browse”), one-sentence subcopy, primary CTA button `Join the waitlist`, secondary `View docs` link.
2) **Form**: email input, optional role dropdown (Developer / Product / Founder), checkbox to opt into dev updates. Inline success state—replace the form with “You’re on the list” and next steps.
3) **Proof Points**: three bullets (Privacy-respecting memory, Works across WokSpec products, Fast browser-native panel). Keep to one line each.
4) **How it fits**: 2-column text block explaining extension + API with a small code snippet showing `NikitaWidget` usage.
5) **Footer**: links to Docs, Status, API reference, Privacy. Keep slim; no social icons.

## Tone & Copy
- Direct and calm. Avoid exclamation points and marketing hyperbole.
- Emphasize reliability, privacy, and speed. Mention “built for WokSpec, open to the web.”
- No competitor names or comparisons.
- Keep headings under 40 characters; body lines under ~90 characters.

## Accessibility & Performance
- Respect prefers-reduced-motion; only fade-in is allowed and must be subtle.
- Minimum 4.5:1 contrast on text; buttons must meet 3:1.
- Ship as static page; target <50KB CSS and no client JS beyond the form submit.

## Handoff Notes
- Publish under `apps/nikita/apps/web` (or the landing page entry) with the pink theme applied globally.
- Hook the form to the existing waitlist endpoint (POST `/v1/waitlist` on nikita API when available); if not wired yet, store locally and display success mock.
- Reuse the shared header/footer from wokspec.org only if it does not introduce dark theme styles; otherwise include a minimal local nav.
