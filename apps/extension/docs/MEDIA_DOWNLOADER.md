# WokWeb Media Downloader

## Architecture

Media downloads are handled by WokAPI on Cloudflare Workers using yt-dlp.

## Flow

1. Extension sends POST to `https://api.wokspec.org/v1/media/download` with `{ url, format }`
2. WokAPI enqueues a job in Upstash Queue
3. A Cloudflare Worker Cron picks up jobs and calls yt-dlp via a VPS/subprocess
4. Download link is stored in R2 and returned to the extension

## Supported Platforms

- YouTube (MP4/MP3/WAV)
- Instagram Reels/Posts
- TikTok videos
- Twitter/X videos
- Reddit videos

## WokAPI Endpoint (to be implemented)

```
POST /v1/media/download
Authorization: Bearer <access_token>
{
  "url": "https://youtube.com/watch?v=...",
  "format": "mp4" | "mp3" | "wav"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "estimatedWait": 30
  }
}
```

## Note

The actual yt-dlp processing requires a VPS or Cloudflare Workers with subprocess support (Workers Unbound). This is scaffolded in the extension but the WokAPI endpoint `/v1/media/download` is a future implementation.
