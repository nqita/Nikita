# Firefox Add-ons (AMO) Submission Guide

## Prerequisites

1. Mozilla account at [addons.mozilla.org](https://addons.mozilla.org/developers/)
2. No registration fee

## Build for Firefox

WokWeb supports Firefox via Manifest V2 (Firefox doesn't fully support MV3 yet):

```bash
cd wokweb
npm run build:firefox
# Produces: build/firefox-mv2-prod.zip
```

## Firefox-Specific Notes

### Manifest V2 vs V3
Firefox uses MV2. Key differences:
- `background.service_worker` → `background.scripts`
- `chrome.action` → `browser.action`
- Use `browser.*` API namespace (or polyfill with `webextension-polyfill`)

### Browser API Polyfill
Add to wokweb/package.json dependencies:
```json
"webextension-polyfill": "^0.12.0"
```

Import in background:
```typescript
import browser from "webextension-polyfill";
// Use browser.* instead of chrome.* for cross-browser compat
```

### Storage API Differences
- `chrome.storage.session` — Not available in Firefox MV2
- Workaround: Use `sessionStorage` (in-memory) or `browser.storage.local` with session flag

## Store Listing

Same copy as Chrome Web Store (see CHROME_STORE_SUBMISSION.md).

**AMO Category:** Productivity

## Submission Checklist

- [ ] Build Firefox version: `npm run build:firefox`
- [ ] Test in Firefox with Developer Edition
- [ ] Handle `chrome.storage.session` fallback
- [ ] Package: `npm run package`
- [ ] Upload to AMO
- [ ] Source code submission (AMO requires source for review if minified)
- [ ] Fill in listing details
- [ ] Submit (typically 1-7 business days)

## Source Code Submission

AMO requires submitting source code for extensions with minified code. Upload the entire `wokweb/` directory (excluding `node_modules/` and `build/`).
