# Chrome Web Store Submission Guide

## Prerequisites

1. Developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. One-time $5 registration fee paid
3. Extension built with `npm run package`

## Build for Submission

```bash
cd wokweb
npm install
npm run build
npm run package
# Produces: build/chrome-mv3-prod.zip
```

## Required Assets

| Asset | Size | Notes |
|-------|------|-------|
| Extension icon (128×128) | PNG | Already in `assets/icon.png` |
| Small icon (16×16) | PNG | Already in `assets/icon16.png` |
| Screenshot 1 | 1280×800 or 640×400 | Popup UI |
| Screenshot 2 | 1280×800 | Content clipping in action |
| Screenshot 3 | 1280×800 | Media downloader |
| Promo tile | 440×280 | Optional but recommended |

## Store Listing Copy

**Extension Name:** WokWeb — Clip, Download, AI

**Short Description (up to 132 chars):**
> Clip pages, download YouTube/Instagram videos, save social posts, and get AI insights on any website.

**Detailed Description:**
> WokWeb is the official WokSpec browser extension. It brings your entire WokSpec workflow directly into your browser.
>
> **Features:**
> • **Page Clipping** — Select any text, image, or link and save it to your WokSpec account
> • **Media Downloader** — Download YouTube videos as MP4, MP3, or WAV. Also supports Instagram Reels, TikTok, Twitter/X, and Reddit
> • **Social Saver** — Floating save buttons on tweets, Instagram posts, and Reddit threads
> • **Ask Nikita** — WokSpec's AI assistant overlaid on any page. Ask questions, get summaries, or analyze content
> • **Side Panel Launcher** — Quick access to Studio, WokHei, and Chopsticks without leaving your current tab
> • **Context Menu** — Right-click to clip, save, or download anything
>
> **Sign in with your WokSpec account** to sync clips and unlock all features. Works with GitHub, Google, or Discord login.
>
> **Privacy:** We only process the content you explicitly clip or ask us to analyze. We never read your browsing history or transmit data in the background.

**Category:** Productivity

**Tags:** productivity, workflow, downloader, ai, clips

## Privacy Policy URL

https://wokspec.org/privacy

## Permissions Justification

| Permission | Justification |
|-----------|---------------|
| `tabs` | To get current tab URL for clipping |
| `storage` | To store auth tokens and clip history |
| `contextMenus` | To add right-click save/clip/download options |
| `scripting` | To inject save buttons on social media pages |
| `downloads` | To trigger file downloads after media processing |
| `notifications` | To notify when downloads complete |
| `activeTab` | To access page content when user activates the extension |
| `host_permissions: <all_urls>` | Required to inject content script on all pages for clipping |

## Submission Checklist

- [ ] Build and test locally (`npm run dev`)
- [ ] Test popup UI
- [ ] Test content script on: Google, Twitter/X, YouTube, Instagram, Reddit
- [ ] Test media download (mock mode since API needs real keys)
- [ ] Test AI overlay toggle
- [ ] Test settings page
- [ ] Package: `npm run package`
- [ ] Upload `build/chrome-mv3-prod.zip` to developer console
- [ ] Fill in all store listing fields
- [ ] Upload screenshots
- [ ] Submit for review (typically 1-3 business days)
