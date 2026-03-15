# Contributing to Nikita

Nikita is the AI layer for WokSpec (API, widget, browser extension).

## Quick start
1. Fork and clone.
2. Install deps: `npm install`.
3. Run API locally: `npm run dev --workspace apps/api` (Cloudflare Workers).
4. Run extension: `npm run dev --workspace apps/extension`.
5. Run lint/tests before PR: `npm test` (or relevant workspace scripts).

## Guidelines
- Keep responses privacy-respecting; do not add telemetry.
- Prefer small, reviewable PRs with screenshots for UI changes.
- Update docs when changing API contracts or UI flows.

## Security
Report security issues privately to security@wokspec.org with steps to reproduce. Do not open public issues for vulnerabilities.

## License
Nikita is source-available under FSL-1.1-MIT. By contributing, you agree your contributions follow the project license.
