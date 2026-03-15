# Nikita — Full API Reference

Base URL: `https://nikita.wokspec.org`

All endpoints require `Authorization: Bearer <jwt>` (WokSpec JWT, signed with the shared `JWT_SECRET`).

---

## Health

### `GET /health`
Returns `200 OK` with `{ "status": "ok" }`.

### `GET /v1/status`
Returns current provider configuration, spend policy, and per-route model info.

```json
{
  "spend_policy": "free-only",
  "providers": {
    "cf_workers_ai": { "enabled": true, "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    "openai": { "enabled": false },
    "groq": { "enabled": false }
  }
}
```

---

## Chat

### `POST /v1/chat`

Stateful conversation. Session history is stored in KV and replayed on subsequent calls with the same `sessionId`.

**Request body:**
```json
{
  "message": "Help me write an isometric tileset prompt",
  "sessionId": "sess_abc123",
  "quality": "balanced",
  "product":  "studio",
  "integration": {
    "name": "Studio Pixel Studio",
    "kind": "webapp",
    "url": "https://studio.wokspec.org/pixel",
    "pageTitle": "AI Generator",
    "capabilities": ["chat", "generate"],
    "instructions": "User is generating pixel art. Focus on style and prompt guidance."
  }
}
```

| Field | Required | Description |
|---|---|---|
| `message` | Yes | User's message |
| `sessionId` | No | Omit to start a new session |
| `quality` | No | `fast` \| `balanced` \| `best` (default: `balanced`) |
| `product` | No | Calling product identifier (for logging) |
| `integration` | No | Integration context object |

**Response `200`:**
```json
{
  "response": "For an isometric tileset, try: ...",
  "sessionId": "sess_abc123",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
}
```

---

### `GET /v1/chat/sessions`

List the authenticated user's chat sessions.

**Response `200`:**
```json
[
  {
    "sessionId": "sess_abc123",
    "created_at": 1710000000,
    "last_message_at": 1710003600,
    "product":  "studio",
    "message_count": 12
  }
]
```

---

### `GET /v1/chat/:sessionId`

Fetch full message history for a session.

**Response `200`:**
```json
{
  "sessionId": "sess_abc123",
  "messages": [
    { "role": "user", "content": "...", "ts": 1710000000 },
    { "role": "assistant", "content": "...", "ts": 1710000001 }
  ]
}
```

---

### `DELETE /v1/chat/:sessionId`

Delete a session and its message history from KV.

**Response `204`:** no content

---

## Generate

### `POST /v1/generate`

One-shot content generation with optional text transforms.

**Request body:**
```json
{
  "prompt": "Write a product description for a pixel art game asset pack",
  "transform": "expand",
  "quality": "best",
  "product":  "studio"
}
```

| `transform` | Effect |
|---|---|
| `null` / omit | Generate from prompt as-is |
| `improve` | Enhance the provided text |
| `rewrite` | Rephrase while keeping meaning |
| `expand` | Lengthen and add detail |
| `shorten` | Condense to key points |

**Response `200`:**
```json
{
  "result": "...",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "tokens_used": 312
}
```

---

## Analyze

### `POST /v1/analyze`

Analyze provided content in one of three modes.

**Request body:**
```json
{
  "content": "Full text or HTML to analyze...",
  "mode": "summarize",
  "quality": "fast",
  "integration": { "name": "WokHei", "kind": "webapp" }
}
```

| `mode` | Output |
|---|---|
| `summarize` | 3–5 sentence summary |
| `review` | Structured feedback (strengths, weaknesses, suggestions) |
| `extract` | Key entities, facts, and data points as structured JSON |

**Response `200`:**
```json
{
  "result": "...",     // string for summarize/review, object for extract
  "mode": "summarize",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
}
```

---

## Error Format

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 429 | `RATE_LIMITED` | Per-user rate limit exceeded |
| 503 | `PROVIDER_UNAVAILABLE` | AI provider down; retry |

---

## Rate Limits

Per authenticated user (keyed by `userId` in KV):

| Tier | Chat calls/min | Generate/min | Analyze/min |
|---|---|---|---|
| Free | 10 | 5 | 5 |
| Builder | 60 | 30 | 30 |
| Pro | 300 | 150 | 150 |
| Enterprise | Unlimited | Unlimited | Unlimited |

Unauthenticated widget requests: 5 calls/min per IP (Workers AI only).
