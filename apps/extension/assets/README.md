# WokWeb Assets

Required icon files for extension submission:

| File | Size | Format | Used In |
|------|------|--------|---------|
| `icon.png` | 128×128 | PNG | Chrome/Firefox store + extension icon |
| `icon48.png` | 48×48 | PNG | Toolbar icon |
| `icon32.png` | 32×32 | PNG | Windows icon |
| `icon16.png` | 16×16 | PNG | Favicon in extension pages |

## Creating Icons

Icons should use the WokSpec blue (#3b82f6) with a "✦" or "W" mark on dark background (#09090b).

**Quick method (SVG → PNG):**
```bash
# Install rsvg-convert (brew install librsvg or apt-get install librsvg2-bin)
rsvg-convert -w 128 -h 128 icon.svg > assets/icon.png
rsvg-convert -w 48 -h 48 icon.svg > assets/icon48.png
rsvg-convert -w 32 -h 32 icon.svg > assets/icon32.png
rsvg-convert -w 16 -h 16 icon.svg > assets/icon16.png
```

## Icon SVG Template

Create `assets/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#09090b"/>
  <text x="64" y="85" font-family="-apple-system, sans-serif" font-size="64" font-weight="700" fill="#3b82f6" text-anchor="middle">✦</text>
</svg>
```
