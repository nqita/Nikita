# CLAUDE.md — Eral Agent Guide

> This file is the authoritative reference for AI coding agents (Claude, Copilot, etc.) working in
> the Eral repository. Read it before writing any code.

---

## What Is Eral?

Eral is the **AI backbone for the WokSpec ecosystem**. It runs as a **Cloudflare Worker** (edge
runtime, zero cold-starts) built with **Hono** and exposes a REST API used by every WokSpec
product.

**What Eral powers:**

- **Chat with persistent session memory** — conversation history stored in Cloudflare KV, 7-day
  TTL, up to 40 messages per session.
- **Brand context injection** — Eral knows the user's product context and injects relevant prompts.
- **Site-wide AI companion** — embedded via `widget.js` on any WokSpec product page.
- **News analysis** — backs WokPost article summarization and sentiment analysis.
- **Content generation** — powers WokGen's prompt-driven generation features.
- **Browser extension** — provides an AI overlay, composition assist, and video analysis in
  Chrome, Firefox, and Edge via the Plasmo-based extension in `apps/extension/`.

### Monorepo Structure

```
Eral/
├── src/                          # Root: Hono Cloudflare Worker API
│   ├── index.ts                  # Main Hono app, route mounting, CORS
│   ├── types.ts                  # All shared TypeScript types (Env, EralUser, etc.)
│   ├── middleware/
│   │   └── index.ts              # securityHeaders, requestId, rateLimit, requireAuth, optionalAuth
│   ├── routes/
│   │   ├── chat.ts               # POST /v1/chat — chat with persistent memory
│   │   ├── generate.ts           # POST /v1/generate — content generation
│   │   ├── analyze.ts            # POST /v1/analyze — analysis (summarize, sentiment, etc.)
│   │   ├── wokgen.ts             # POST /v1/wokgen/prompt — WokGen-specific generation
│   │   ├── status.ts             # GET /v1/status — service status
│   │   └── keys.ts               # GET|POST|DELETE /v1/keys — API key management
│   └── lib/
│       ├── openai.ts             # OpenAI + Cloudflare AI runner, model routing
│       ├── memory.ts             # KV-backed session memory (getMemory, appendMemory, clearMemory)
│       ├── context.ts            # buildContext(), productPromptExtras() — brand/context injection
│       ├── jwt.ts                # WokSpec JWT verification (jose)
│       ├── api-keys.ts           # Eral API key create/verify (eral_ prefix)
│       └── rate-limit.ts         # Cloudflare KV-based rate limiting
├── apps/
│   ├── extension/                # Plasmo browser extension (Chrome/Firefox/Edge)
│   │   └── src/
│   │       ├── background/       # Service worker (background/index.ts)
│   │       ├── contents/         # Content scripts (overlays, compose, video, web)
│   │       ├── lib/              # Extension-side API client, storage, error handling
│   │       ├── popup/            # Extension popup UI
│   │       ├── sidepanel/        # Side panel UI
│   │       ├── options/          # Options page
│   │       └── tabs/             # Full-page tabs (welcome)
│   └── web/                      # Next.js web app (chat UI, login, keys management)
│       └── src/
│           ├── app/              # Next.js App Router pages
│           └── components/       # Chat UI components
├── dist/
│   └── eral-widget.js            # Pre-built embeddable widget bundle (IIFE)
├── widget/                       # Widget source (builds to dist/eral-widget.js)
├── wrangler.toml                 # Cloudflare Worker configuration
├── package.json                  # Root (API) package.json
└── tsconfig.json                 # Root TypeScript config
```

---

## Hard Constraints — DO NOT Violate

| Rule | Why |
|------|-----|
| **Never log user message content** | User messages are private. They must not appear in Worker logs, Sentry breadcrumbs, or any observability output. Log request metadata (session ID, user ID, product) only. |
| **All API routes require auth** | Use `requireAuth()` middleware. The only exceptions are `/health`, `/api/health`, `/`, and `/widget.js`. Never add an unauthenticated route that touches user data. |
| **Never expose JWT_SECRET** | It is a Cloudflare Worker secret. Never log it, echo it in responses, or commit it to source. |
| **Never break the `/v1/chat` contract** | WokSpec products, the browser extension, and external sites built on Eral API keys depend on the request/response shape. |
| **Widget must work in any page context** | `dist/eral-widget.js` runs as an IIFE on third-party pages. It must not pollute the global scope, must not conflict with host page CSS, and must not trigger CSP violations on well-configured sites. |
| **Session memory is user-scoped** | The KV key format is `mem:{userId}:{sessionId}`. Never allow one user to read another user's memory by accepting user IDs from request bodies. |
| **Content scripts must not pollute the DOM** | Plasmo content scripts run in isolated worlds but CSS can still leak. Use Shadow DOM for all UI injections. |

---

## API Architecture (Hono + Cloudflare Workers)

### Entry Point (`src/index.ts`)

The root Hono app:
1. Applies global middleware: `requestId()`, `securityHeaders()`, CORS.
2. Mounts all routes at both `/v1/*` (Workers.dev direct) and `/api/v1/*` (custom domain).
3. Serves `widget.js` from the pre-built IIFE bundle (imported as a text blob via `wrangler.toml`
   `[[rules]]`).

### Adding a New API Endpoint

1. **Create a route file** at `src/routes/<name>.ts`.
2. Create a `Hono` instance typed with `{ Bindings: Env }`:
   ```ts
   import { Hono } from 'hono';
   import { zValidator } from '@hono/zod-validator';
   import { z } from 'zod';
   import type { Env, EralUser } from '../types';
   import { requireAuth, rateLimit } from '../middleware';

   const myRouter = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
   myRouter.use('*', requireAuth());

   myRouter.post(
     '/',
     rateLimit('default'),
     zValidator('json', z.object({ input: z.string().min(1).max(4000) })),
     async (c) => {
       const user = c.get('user');
       const { input } = c.req.valid('json');
       // ... handle ...
       return c.json({ data: { result: '...' }, error: null });
     }
   );

   export { myRouter };
   ```
3. **Import and mount** in `src/index.ts`:
   ```ts
   import { myRouter } from './routes/my-route';
   app.route('/v1/my-endpoint', myRouter);
   app.route('/api/v1/my-endpoint', myRouter);
   ```
4. **Update `src/types.ts`** if new KV namespaces or secrets are needed.
5. **Update `wrangler.toml`** to bind any new KV namespaces.
6. **Add the endpoint** to the index route's `endpoints` map in `src/index.ts`.

### Response Shape

All Eral responses follow a consistent envelope:

```ts
// Success
{ data: T, error: null }

// Error
{ data: null, error: { code: string, message: string, status: number } }
```

Always use this shape. Never return a bare object or a different error format.

---

## Authentication & Authorization

### Two Auth Methods

Eral supports two authentication methods, both via the `Authorization: Bearer <token>` header:

| Method | Token shape | Source |
|--------|-------------|--------|
| **WokSpec JWT** | Standard JWT | Issued by WokSpec auth (shared `JWT_SECRET`) |
| **Eral API key** | `eral_<random>` | Created via `POST /v1/keys`, stored in `KV_API_KEYS` |

### Using Auth in Routes

```ts
import { requireAuth, optionalAuth } from '../middleware';

// Require auth — returns 401 if missing/invalid
router.use('*', requireAuth());
// or with a scope check for API key auth:
router.use('*', requireAuth('chat'));

// Get the resolved user:
const user = c.get('user');   // EralUser — always non-null after requireAuth
const auth = c.get('auth');   // EralAuth — includes method and apiKey record

// Optional auth — user may be null
router.use('*', optionalAuth());
const user = c.get('user'); // EralUser | null
```

### API Key Scopes

| Scope | Grants access to |
|-------|-----------------|
| `chat` | `/v1/chat` |
| `generate` | `/v1/generate` |
| `analyze` | `/v1/analyze` |
| `wokgen` | `/v1/wokgen/*` |
| `*` | All endpoints |

### JWT Verification

`src/lib/jwt.ts` uses the `jose` library to verify WokSpec JWTs against `JWT_SECRET`. The JWT
payload contains `{ sub: userId, email, displayName, avatarUrl }`.

---

## Chat & Session Memory

### How Memory Works

Conversation history is stored in **Cloudflare KV** (`KV_MEMORY` binding):

- **Key format:** `mem:{userId}:{sessionId}`
- **Value:** JSON array of `{ role: 'user' | 'assistant', content: string }` messages
- **Max messages:** 40 (oldest messages are dropped when limit is hit)
- **TTL:** 7 days (reset on every write)

```ts
import { getMemory, appendMemory, clearMemory, listSessions } from '../lib/memory';

// Read history
const history = await getMemory(c.env.KV_MEMORY, user.id, sessionId);

// Append after a successful exchange (fire-and-forget — non-fatal)
appendMemory(c.env.KV_MEMORY, user.id, sessionId, [
  { role: 'user', content: userMessage },
  { role: 'assistant', content: aiResponse },
]).catch(() => {});

// Clear a session
await clearMemory(c.env.KV_MEMORY, user.id, sessionId);
```

### Session IDs

Session IDs are user-provided strings (max 128 chars). The default is `"default"`. Each user can
have multiple named sessions (e.g., `"work"`, `"creative"`, `"support"`).

**Security:** The memory key always includes `userId` as a prefix. Never construct a memory key
using only a session ID — that would allow session ID guessing attacks.

---

## Brand Context & Product Prompt Injection

`src/lib/context.ts` handles injecting product-specific context into AI prompts.

### `buildContext()`

Builds a context string from the user object and request metadata:

```ts
import { buildContext, productPromptExtras } from '../lib/context';

const userContext = buildContext({ user, product, pageContext });
const productExtras = productPromptExtras(product);
// product: 'woksite' | 'wokgen' | 'wokpost' | 'chopsticks' | 'extension' | undefined
```

### Product Integrations

| Product | What Eral does |
|---------|---------------|
| `woksite` | General site-wide AI companion |
| `wokgen` | Content generation with WokGen brand templates |
| `wokpost` | News article analysis, summarization, sentiment |
| `chopsticks` | Discord bot AI commands (assistant, imagine, etc.) |
| `extension` | Browser AI overlay, compose assist, video analysis |

When adding a new WokSpec product integration:
1. Add it to the `ProductSchema` zod enum in the relevant route(s).
2. Add a case in `productPromptExtras()` in `src/lib/context.ts`.
3. Update the CORS origin list in `src/index.ts` if the product has a new subdomain.

---

## AI Model Routing

`src/lib/openai.ts` handles model selection and fallback:

### Primary: OpenAI GPT-4o

Used when `OPENAI_API_KEY` is set. This is the default and provides best quality.

```ts
model: 'gpt-4o'
max_tokens: 1024  (default, override per route)
temperature: 0.7  (default, override per route)
```

### Fallback: Cloudflare Workers AI

Used when `OPENAI_API_KEY` is absent (e.g., development without an OpenAI key). Uses
`@cf/meta/llama-3.1-8b-instruct` via the `AI` binding.

### `run()` Function

```ts
import { run, eralSystemPrompt } from '../lib/openai';

const systemPrompt = eralSystemPrompt(extraContext);
const result = await run(
  { messages, maxTokens: 1024 },
  { openaiApiKey: c.env.OPENAI_API_KEY, cfAI: c.env.AI }
);
// result: { content: string, model: ModelInfo }
```

### Model Selection Rules

- Default to GPT-4o for all chat, generation, and analysis tasks.
- Fall back to Cloudflare AI only when `OPENAI_API_KEY` is absent.
- Never expose which model was used in error messages.
- `result.model.fallback` is `true` when Cloudflare AI was used.

---

## Rate Limiting

Rate limiting uses Cloudflare KV (`KV_RATE_LIMITS` binding). Limits are applied per client IP.

```ts
import { rateLimit } from '../middleware';

// Apply per-route rate limit
router.post('/', rateLimit('chat'), ...);
```

**Rate limit types:**

| Type | Typical limit |
|------|--------------|
| `default` | General endpoints |
| `chat` | Chat endpoint (tighter — LLM calls are expensive) |
| `generate` | Content generation |
| `analyze` | Analysis |
| `wokgen` | WokGen generation |
| `keys` | API key management |

When adding a new route, always apply `rateLimit()`. Choose the tightest appropriate type.

---

## Cloudflare Worker Bindings (`src/types.ts`)

The `Env` interface defines all Worker bindings:

```ts
export interface Env {
  KV_SESSIONS:    KVNamespace;          // Session data (legacy/future use)
  KV_RATE_LIMITS: KVNamespace | undefined;  // Rate limit buckets
  KV_MEMORY:      KVNamespace | undefined;  // Conversation memory
  KV_API_KEYS:    KVNamespace | undefined;  // API keys for external sites

  AI: Ai | undefined;                   // Cloudflare Workers AI (fallback LLM)

  JWT_SECRET:      string;              // Shared WokSpec JWT secret
  OPENAI_API_KEY:  string | undefined;  // OpenAI API key
  SENTRY_DSN:      string | undefined;  // Error tracking
  ENVIRONMENT:     string;             // 'production' | 'development' | 'staging'
}
```

When adding a new KV namespace or secret:
1. Add it to the `Env` interface in `src/types.ts`.
2. Add the binding to `wrangler.toml` under `[[kv_namespaces]]` or `[vars]`.
3. Add it to `.env.example` with a placeholder comment.

---

## Environment Variables

All variables are set via **Cloudflare Worker secrets** (not env files in production).
For local development, use `.dev.vars` (gitignored, equivalent to `.env` for `wrangler dev`).

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Shared WokSpec JWT signing secret (must match WokAPI exactly) |
| `OPENAI_API_KEY` | Recommended | OpenAI API key for GPT-4o. Falls back to CF AI if absent. |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `ENVIRONMENT` | No | `production` or `development` (default: `development`) |

**KV Namespaces** (configured in `wrangler.toml`):

| Binding | Purpose |
|---------|---------|
| `KV_SESSIONS` | Session metadata |
| `KV_RATE_LIMITS` | Rate limit buckets |
| `KV_MEMORY` | Conversation history |
| `KV_API_KEYS` | Eral API keys (external site access) |

**To set a secret in production:**

```bash
wrangler secret put JWT_SECRET
wrangler secret put OPENAI_API_KEY
```

**Never commit real values.** The `.env.example` file uses placeholder comments like
`sk-...` or `<openssl rand -hex 32>`. The `.gitignore` excludes `.dev.vars`.

---

## Browser Extension (Plasmo, `apps/extension/`)

The extension is built with **Plasmo** — a framework that compiles to Chrome MV3, Firefox MV2/MV3,
Edge MV3, and Opera MV3 from a single source tree.

### Extension Source Structure

```
apps/extension/src/
├── background/index.ts       # Service worker — handles auth, API requests, message routing
├── contents/                 # Content scripts (injected into web pages)
│   ├── eral-web.ts           # Web page detector / initializer (matches: all_urls)
│   ├── ai-overlay.tsx        # AI chat overlay UI
│   ├── eral-compose.tsx      # AI compose assist (email, docs, forms)
│   ├── eral-compose.css      # Compose UI styles
│   ├── eral-selection.tsx    # Selection-based AI (explain, rewrite)
│   └── eral-video.tsx        # Video transcript/summary overlay
├── lib/
│   ├── api.ts                # API client (routes through background service worker)
│   ├── eral.ts               # Eral-specific types and helpers
│   ├── storage.ts            # Extension storage (Plasmo storage API)
│   └── errors.ts             # Error types
├── popup/index.tsx           # Browser toolbar popup
├── sidepanel/index.tsx       # Side panel (Chrome/Edge)
├── options/index.tsx         # Extension options page
└── tabs/welcome.tsx          # Welcome tab (shown on install)
```

### Plasmo Patterns

```ts
// Content script — must export a config and a React component (or a function)
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: false,
};

// For UI injection, Plasmo uses Shadow DOM automatically for React components.
// For vanilla TS content scripts, manually use Shadow DOM:
const shadow = document.createElement("div");
const shadowRoot = shadow.attachShadow({ mode: "open" });
document.body.appendChild(shadow);
```

```ts
// Background service worker — handle messages from content scripts
import { sendToBackground } from "@plasmohq/messaging";

// In content script:
const response = await sendToBackground({ name: "chat", body: { message } });

// In background/index.ts:
import { onMessage } from "@plasmohq/messaging";
onMessage("chat", async (req) => {
  // ... call Eral API ...
  return { response: "..." };
});
```

### Extension Environment Variables

Extension env vars are prefixed with `PLASMO_PUBLIC_` (exposed to content scripts):

```
PLASMO_PUBLIC_API_URL=https://eral.wokspec.org
PLASMO_PUBLIC_SITE_URL=https://wokspec.org
```

Set in `.env` in `apps/extension/`. Do **not** put auth tokens in `PLASMO_PUBLIC_*` — they are
bundled into the extension and visible to users.

Auth tokens are retrieved at runtime via the background service worker after user login.

### Content Script Isolation Rules

- **Never modify `document.body` directly** for UI. Always use Shadow DOM or Plasmo's
  React injection which creates an isolated container.
- **Never add global CSS** that could affect the host page.
- **Never add global event listeners** without cleanup. Remove them on unmount.
- **Never access the host page's JavaScript context** unless absolutely necessary (and document why).
- **Content scripts run in isolated worlds** in MV3 — they cannot access page JS variables.

### Building the Extension

```bash
cd apps/extension
npm run build         # Chrome MV3 (production)
npm run build:firefox # Firefox MV2 (production)
npm run dev           # Dev with hot reload (Chrome)
```

Build output goes to `apps/extension/build/<target>-<version>/`.

---

## Embeddable Widget (`dist/eral-widget.js`)

The widget is a pre-built IIFE that can be embedded on any page:

```html
<script src="https://eral.wokspec.org/widget.js"></script>
<script>
  EralWidget.init({
    apiKey: 'eral_...',
    product: 'woksite',
    theme: 'dark',
  });
</script>
```

The widget bundle is served directly by the Worker from `dist/eral-widget.js` (imported as a
text blob via `wrangler.toml` `[[rules]]`).

**Widget rules:**
- Must not define globals other than `window.EralWidget`.
- Must use Shadow DOM for all UI.
- Must not include large dependencies (keep bundle size minimal).
- Must work on pages with strict CSP (no `eval`, no `new Function`).

---

## Next.js Web App (`apps/web/`)

The web app provides:
- Chat UI at `/chat`
- Login/auth flow at `/login` and `/auth/callback`
- API key management at `/keys`
- Documentation at `/docs`

It is a **static export** (configured in `next.config.ts`). It talks to the Eral API at
`NEXT_PUBLIC_API_URL`.

---

## Security Rules

### Message Content Privacy

> **Never log user message content.** This is non-negotiable.

```ts
// ✅ OK — log metadata
console.log('[Eral/chat] user=%s session=%s product=%s', user.id, sessionId, product);

// ❌ NEVER — do not log message content
console.log('[Eral/chat] message=%s', message);
```

The only place user message content should exist is:
1. In the request body during processing.
2. In Cloudflare KV memory (encrypted at rest by Cloudflare).
3. In the response body sent back to the requesting client.

### Auth Security

- `JWT_SECRET` must match between Eral and WokAPI exactly. If they don't match, all JWTs will
  fail verification.
- API key hashes are stored in KV (not plaintext). The `verifyApiKey()` function handles
  comparison.
- The `eral_` prefix on API keys is intentional — it allows fast routing (JWT vs. key) and is
  picked up by secret scanners.

### CORS

The CORS config in `src/index.ts` is intentionally permissive for the API (any origin is allowed
since auth is the security boundary). However:
- `credentials: true` is set — this enables cookie-based auth for the web app.
- The origin validator function returns the requesting origin (or `*`) — Cloudflare enforces that
  the `Authorization` header check happens regardless of origin.

---

## Extending Eral's Integration with WokSpec Products

When a new WokSpec product wants to use Eral:

1. **Add the product's origin** to the `wokspecOrigins` allowlist in `src/index.ts`.
2. **Add a product case** to `productPromptExtras()` in `src/lib/context.ts`.
3. **Add the product value** to the `ProductSchema` zod enum in the route handlers.
4. **Issue an Eral API key** with appropriate scopes for the product's backend (if server-to-server).
5. **For browser-based access**, use the WokSpec JWT (user must be logged in).

---

## Commit Conventions

This repo uses **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New API endpoint, new extension feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency updates, config |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `perf` | Performance improvements |
| `style` | Formatting, no logic change |
| `test` | Adding or fixing tests |

**Scope examples:** `api`, `chat`, `extension`, `widget`, `auth`, `memory`, `ci`, `deps`

---

## CI Overview

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | push/PR to main | Type-check root API + build extension |
| `codeql.yml` | push/PR/schedule | CodeQL security analysis (TypeScript) |
| `gitleaks.yml` | push/PR | Secret scanning |

---

## Testing

```bash
# Root API
npm run type-check        # TypeScript type checking
npm run test              # Vitest unit tests (if present)
npm run dev               # Local development (wrangler dev)

# Extension
cd apps/extension
npm run build             # Build + type check (via Plasmo)
```

---

## Agent Guidance

### Before Making Changes

1. Read `src/types.ts` to understand all bindings and types.
2. Read the existing route file closest to your change before writing new code.
3. Check `src/middleware/index.ts` for existing middleware before writing custom auth logic.

### When Adding a Route

- Always add `requireAuth()` unless it's a public info endpoint.
- Always add `rateLimit()` with an appropriate type.
- Always use `zValidator` for request body validation.
- Always return the `{ data, error }` envelope.
- Mount at both `/v1/...` and `/api/v1/...` in `src/index.ts`.

### When Editing the Extension

- Test in at least Chrome and Firefox (build targets differ).
- Never break the content script / background script message interface without updating both sides.
- Content script CSS must be scoped to Shadow DOM — never add global styles.

### Prohibited Actions

- Do not log user message content anywhere.
- Do not add unauthenticated routes that access user data.
- Do not break the `{ data, error }` response envelope.
- Do not commit `.dev.vars` or any file containing `JWT_SECRET` or `OPENAI_API_KEY`.
- Do not bypass `requireAuth()` with ad-hoc token parsing in route handlers.
- Do not add `console.log` calls with sensitive data in production code paths.

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono app entry point, CORS, route mounting |
| `src/types.ts` | All TypeScript types — Env, EralUser, ApiResponse, etc. |
| `src/middleware/index.ts` | securityHeaders, requestId, rateLimit, requireAuth, optionalAuth |
| `src/routes/chat.ts` | Chat with persistent memory |
| `src/routes/generate.ts` | Content generation |
| `src/routes/analyze.ts` | Analysis (summarize, sentiment, explain, etc.) |
| `src/routes/wokgen.ts` | WokGen-specific generation |
| `src/routes/status.ts` | Service status |
| `src/routes/keys.ts` | API key CRUD |
| `src/lib/openai.ts` | AI model runner (GPT-4o + CF AI fallback) |
| `src/lib/memory.ts` | KV conversation memory |
| `src/lib/context.ts` | Brand context and product prompt injection |
| `src/lib/jwt.ts` | WokSpec JWT verification |
| `src/lib/api-keys.ts` | Eral API key management |
| `src/lib/rate-limit.ts` | KV-based rate limiting |
| `wrangler.toml` | Cloudflare Worker config (bindings, routes, rules) |
| `apps/extension/src/background/index.ts` | Extension service worker |
| `apps/extension/src/lib/api.ts` | Extension API client |
| `dist/eral-widget.js` | Pre-built embeddable widget |

---

## Links

- [README.md](README.md) — Project overview
- [apps/extension/README.md](apps/extension/README.md) — Extension docs
- [wrangler.toml](wrangler.toml) — Cloudflare Worker config
- [.env.example](.env.example) — Environment variable reference
