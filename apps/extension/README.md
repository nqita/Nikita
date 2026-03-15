# WokWeb

WokWeb is the open-source WokSpec browser extension. Clip pages, download media, save links, and get AI insights on any website.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **📋 Page Clipping** — Select text, images, or links and save them to WokSpec
- **⬇️ Media Downloader** — Download YouTube videos as MP4/MP3/WAV
- **💬 Social Saver** — Auto save-buttons on Twitter/X, Instagram, Reddit
- **✦ AI Overlay** — Ask Nikita (WokSpec AI) about any page
- **🗂 Side Panel** — Quick launcher, clip history, and WokSpec tools
- **🖱 Context Menu** — Right-click to clip, save, or download anything

## Browser Support

| Browser | Target | Status |
|---------|--------|--------|
| Chrome | MV3 | ✅ |
| Edge | MV3 | ✅ |
| Opera | MV3 | ✅ |
| Firefox | MV2 | ✅ |
| Firefox | MV3 | ✅ |

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
cp .env.example .env.local   # configure API URL
npm install
npm run dev                  # Chrome (default)
npm run dev:firefox          # Firefox
npm run dev:edge             # Edge
```

Load the extension from `build/chrome-mv3-dev` in Chrome (`chrome://extensions` → Load unpacked).

### Build

```bash
npm run build           # Chrome only
npm run build:firefox   # Firefox MV2
npm run build:edge      # Edge
npm run build:opera     # Opera
npm run build:all       # All browsers
```

### Package for stores

```bash
npm run package           # Chrome zip
npm run package:firefox   # Firefox zip
npm run package:edge      # Edge zip
npm run package:opera     # Opera zip
```

## Self-Hosting

Point the extension at your own WokSpec API by setting the env variable before building:

```bash
# .env.local
PLASMO_PUBLIC_API_URL=https://your-api.example.com
PLASMO_PUBLIC_SITE_URL=https://your-site.example.com
```

The OAuth callback URL must be `{PLASMO_PUBLIC_SITE_URL}/auth/callback?accessToken=...&refreshToken=...`.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes and build: `npm run build`
4. Open a pull request

## License

[MIT](LICENSE) — © WokSpec Contributors

## Part of WokSpec

[wokspec.org](https://wokspec.org) | [GitHub](https://github.com/wokspec) | [Discord](https://discord.gg/wokspec)

