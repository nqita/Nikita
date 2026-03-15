import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference — Nikita',
  description: 'Complete Nikita API reference. Chat, generate, analyze, Studio prompts, API key management, and embeddable widget.',
};

// ── Primitives ────────────────────────────────────────────────────────────────

const accent = '#7c3aed';

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-inter, system-ui, sans-serif)',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--background)',
    zIndex: 10,
  } as React.CSSProperties,

  layout: {
    display: 'flex',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    gap: '2.5rem',
    alignItems: 'flex-start',
  } as React.CSSProperties,

  sidebar: {
    width: '200px',
    flexShrink: 0,
    position: 'sticky',
    top: '68px',
  } as React.CSSProperties,

  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3.5rem',
  } as React.CSSProperties,

  section: {} as React.CSSProperties,

  h2: {
    fontWeight: 700,
    fontSize: '1.375rem',
    marginBottom: '0.375rem',
    letterSpacing: '-0.02em',
    paddingTop: '0.5rem',
  } as React.CSSProperties,

  h3: {
    fontWeight: 600,
    fontSize: '1rem',
    marginBottom: '0.625rem',
    marginTop: '1.5rem',
    color: 'var(--foreground)',
  } as React.CSSProperties,

  muted: {
    color: 'var(--muted)',
    fontSize: '0.9375rem',
    lineHeight: 1.65,
    marginBottom: '1.25rem',
  } as React.CSSProperties,

  method: (m: string): React.CSSProperties => ({
    display: 'inline-block',
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: '0.7rem',
    letterSpacing: '0.04em',
    padding: '0.15rem 0.45rem',
    borderRadius: '3px',
    background:
      m === 'POST' ? 'rgba(124,58,237,0.15)' :
      m === 'GET'  ? 'rgba(34,197,94,0.15)' :
      m === 'DELETE' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
    color:
      m === 'POST'   ? '#a78bfa' :
      m === 'GET'    ? '#4ade80' :
      m === 'DELETE' ? '#f87171' : '#60a5fa',
    marginRight: '0.5rem',
    verticalAlign: 'middle',
  }),

  path: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.9rem',
    color: 'var(--foreground)',
    verticalAlign: 'middle',
  } as React.CSSProperties,

  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    marginTop: '1rem',
  } as React.CSSProperties,

  pre: {
    background: '#0d0d0d',
    borderRadius: '0.625rem',
    padding: '1rem 1.25rem',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.8125rem',
    lineHeight: 1.7,
    overflowX: 'auto' as const,
    color: '#e2e8f0',
    marginTop: '0.625rem',
    border: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,

  inlineCode: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.8rem',
    background: 'rgba(124,58,237,0.1)',
    color: '#a78bfa',
    padding: '0.1em 0.4em',
    borderRadius: '3px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    fontWeight: 600,
    color: 'var(--muted)',
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    padding: '0.625rem 1rem',
    borderBottom: '1px solid var(--border)',
  } as React.CSSProperties,

  td: {
    padding: '0.625rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'top' as const,
    lineHeight: 1.5,
  } as React.CSSProperties,

  badge: (required: boolean): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '0.1rem 0.4rem',
    borderRadius: '3px',
    background: required ? 'rgba(239,68,68,0.1)' : 'rgba(100,100,100,0.12)',
    color: required ? '#f87171' : 'var(--muted)',
    letterSpacing: '0.02em',
  }),

  divider: {
    borderColor: 'var(--border)',
    borderStyle: 'solid' as const,
    borderWidth: '0 0 1px 0',
    margin: '0 0 2rem 0',
  } as React.CSSProperties,
};

// ── Components ────────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block text-[0.825rem] text-muted hover:text-foreground transition-colors py-1 no-underline"
    >
      {children}
    </a>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={S.method(method)}>{method}</span>
      <code style={S.path}>{path}</code>
      <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginLeft: 'auto', textAlign: 'right' as const, flexShrink: 0 }}>{desc}</span>
    </div>
  );
}

interface Param { name: string; type: string; required: boolean; desc: string; default?: string }

function ParamsTable({ params }: { params: Param[] }) {
  return (
    <div style={S.card}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Parameter</th>
            <th style={S.th}>Type</th>
            <th style={S.th}>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name}>
              <td style={S.td}>
                <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{p.name}</code>
                {' '}
                <span style={S.badge(p.required)}>{p.required ? 'required' : 'optional'}</span>
              </td>
              <td style={{ ...S.td, color: '#a78bfa', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{p.type}</td>
              <td style={{ ...S.td, color: 'var(--muted)', fontSize: '0.85rem' }}>
                {p.desc}
                {p.default && <> · Default: <code style={{ ...S.inlineCode, fontSize: '0.75rem' }}>{p.default}</code></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ lang, children }: { lang: string; children: string }) {
  return (
    <div style={{ position: 'relative' as const }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#111',
        padding: '0.4rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '0.625rem 0.625rem 0 0',
        marginTop: '0.625rem',
      }}>
        <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'ui-monospace, monospace' }}>{lang}</span>
      </div>
      <pre style={{ ...S.pre, marginTop: 0, borderRadius: '0 0 0.625rem 0.625rem', borderTop: 'none' }}>
        {children}
      </pre>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '1.75rem', height: '1.75rem', background: accent, borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>E</div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Nikita</span>
        </a>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem' }}>
          <a href="/chat" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Chat</a>
          <a href="/keys" style={{ color: 'var(--muted)', textDecoration: 'none' }}>API Keys</a>
          <a href="/docs" style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>Docs</a>
        </div>
      </nav>

      <div style={S.layout}>
        {/* Sidebar */}
        <aside style={S.sidebar}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            On this page
          </div>
          <NavLink href="#overview">Overview</NavLink>
          <NavLink href="#auth">Authentication</NavLink>
          <NavLink href="#chat">Chat</NavLink>
          <NavLink href="#generate">Generate</NavLink>
          <NavLink href="#analyze">Analyze</NavLink>
          <NavLink href="#studio">Studio Prompts</NavLink>
          <NavLink href="#keys">API Keys</NavLink>
          <NavLink href="#widget">Widget Embed</NavLink>
          <NavLink href="#errors">Errors</NavLink>
          <NavLink href="#limits">Rate Limits</NavLink>
        </aside>

        {/* Main */}
        <main style={S.main}>

          {/* ── Overview ── */}
          <section id="overview">
            <h1 style={{ fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
              Nikita API Reference
            </h1>
            <p style={S.muted}>
              The Nikita API is a Cloudflare Worker at <code style={S.inlineCode}>https://nikita.wokspec.org/api</code>.
              It provides conversational AI, content generation, content analysis, Studio prompt engineering, and
              API key management — all secured by WokSpec JWTs or Nikita API keys.
            </p>
            <div style={{ ...S.card, padding: '1.25rem' }}>
              <div style={{ fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Base URL</div>
              <code style={{ ...S.inlineCode, fontSize: '0.875rem' }}>https://nikita.wokspec.org/api</code>
            </div>

            <h3 style={S.h3}>All endpoints</h3>
            <EndpointRow method="GET"    path="/v1/status"         desc="Provider info + capabilities" />
            <EndpointRow method="POST"   path="/v1/chat"           desc="Conversational AI with memory" />
            <EndpointRow method="GET"    path="/v1/chat/sessions"  desc="List active chat sessions" />
            <EndpointRow method="GET"    path="/v1/chat/:sessionId" desc="Retrieve session history" />
            <EndpointRow method="DELETE" path="/v1/chat/:sessionId" desc="Clear session memory" />
            <EndpointRow method="POST"   path="/v1/generate"       desc="Generate posts, code, docs, emails…" />
            <EndpointRow method="POST"   path="/v1/analyze"        desc="Summarize, review, extract, sentiment…" />
            <EndpointRow method="POST"   path="/v1/studio/prompt"  desc="Optimized AI image prompts for Studio" />
            <EndpointRow method="GET"    path="/v1/keys"           desc="List your API keys" />
            <EndpointRow method="POST"   path="/v1/keys"           desc="Create a new API key" />
            <EndpointRow method="DELETE" path="/v1/keys/:id"       desc="Revoke an API key" />
            <EndpointRow method="GET"    path="/widget.js"         desc="Embeddable chat widget bundle" />
          </section>

          {/* ── Auth ── */}
          <section id="auth">
            <h2 style={S.h2}>Authentication</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Every API request (except <code style={S.inlineCode}>GET /v1/status</code> and <code style={S.inlineCode}>GET /widget.js</code>) requires
              an <code style={S.inlineCode}>Authorization</code> header.
              Two credential types are accepted:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {[
                { title: 'WokSpec JWT', desc: 'For WokSpec users. Obtained via OAuth sign-in. Short-lived (15 min), auto-refreshed.', prefix: 'eyJ…' },
                { title: 'Nikita API Key', desc: 'For embedding or server-to-server use. Create one on the Keys page. Long-lived.', prefix: 'eral_…' },
              ].map(({ title, desc, prefix }) => (
                <div key={title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.125rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.375rem' }}>{title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.625rem' }}>{desc}</div>
                  <code style={{ ...S.inlineCode, fontSize: '0.75rem' }}>Authorization: Bearer {prefix}</code>
                </div>
              ))}
            </div>
            <CodeBlock lang="http">
{`Authorization: Bearer eral_<your_key_here>
Content-Type: application/json`}
            </CodeBlock>
          </section>

          {/* ── Chat ── */}
          <section id="chat">
            <h2 style={S.h2}>Chat</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Conversational AI with persistent memory. Sessions are stored in Cloudflare KV with a 7-day TTL.
              Pass the same <code style={S.inlineCode}>sessionId</code> across requests to maintain context.
            </p>

            <h3 style={S.h3}><span style={S.method('POST')}>POST</span> /v1/chat</h3>
            <ParamsTable params={[
              { name: 'message',   type: 'string',  required: true,  desc: 'The user message to send' },
              { name: 'sessionId', type: 'string',  required: false, desc: 'Existing session ID to continue. Omit to start a new session.' },
              { name: 'context',   type: 'string',  required: false, desc: 'Additional context injected into the system prompt (e.g. page content, product name)' },
              { name: 'source',    type: 'string',  required: false, desc: 'Origin product identifier (e.g. "wokhei", "studio", "widget")' },
            ]} />
            <CodeBlock lang="bash">
{`curl https://nikita.wokspec.org/api/v1/chat \\
  -H "Authorization: Bearer eral_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is WokSpec?",
    "sessionId": "my-session-123"
  }'`}
            </CodeBlock>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "response": "WokSpec is a creative tools platform for indie builders...",
    "sessionId": "my-session-123",
    "model": { "provider": "openai", "model": "gpt-4o" }
  },
  "error": null
}`}
            </CodeBlock>

            <h3 style={S.h3}><span style={S.method('GET')}>GET</span> /v1/chat/sessions</h3>
            <p style={{ ...S.muted, marginBottom: '0.75rem' }}>Returns all active session IDs for the authenticated user.</p>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "sessions": ["session-abc", "session-xyz"]
  },
  "error": null
}`}
            </CodeBlock>

            <h3 style={S.h3}><span style={S.method('DELETE')}>DELETE</span> /v1/chat/:sessionId</h3>
            <p style={{ ...S.muted, marginBottom: '0.75rem' }}>Clears the memory for a session. The session ID can be reused afterwards.</p>
            <CodeBlock lang="json — response">
{`{ "data": { "ok": true }, "error": null }`}
            </CodeBlock>
          </section>

          {/* ── Generate ── */}
          <section id="generate">
            <h2 style={S.h2}>Generate</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Structured content generation. Pick a content type and the model applies the right format, tone, and length guidance automatically.
            </p>

            <h3 style={S.h3}><span style={S.method('POST')}>POST</span> /v1/generate</h3>
            <ParamsTable params={[
              { name: 'type',    type: "'post' | 'caption' | 'code' | 'prompt' | 'docs' | 'email' | 'summary'", required: true,  desc: 'Content type to generate' },
              { name: 'topic',   type: 'string',  required: true,  desc: 'What to generate content about (max 2000 chars)' },
              { name: 'context', type: 'string',  required: false, desc: 'Existing content or additional context (max 8000 chars)' },
              { name: 'tone',    type: "'professional' | 'casual' | 'technical' | 'playful'", required: false, desc: 'Writing tone', default: 'casual' },
              { name: 'length',  type: "'short' | 'medium' | 'long'", required: false, desc: 'Approximate output length', default: 'medium' },
              { name: 'product', type: "'woksite' | 'studio' | 'wokhei' | 'api' | 'autiladus'", required: false, desc: 'Tailor output for a specific WokSpec product' },
            ]} />
            <CodeBlock lang="bash">
{`curl https://nikita.wokspec.org/api/v1/generate \\
  -H "Authorization: Bearer eral_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "post",
    "topic": "Launching my new pixel art generator",
    "tone": "casual",
    "length": "short"
  }'`}
            </CodeBlock>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "content": "Just shipped pixel art generation with Studio 🎨...",
    "type": "post",
    "model": { "provider": "openai", "model": "gpt-4o" }
  },
  "error": null
}`}
            </CodeBlock>
          </section>

          {/* ── Analyze ── */}
          <section id="analyze">
            <h2 style={S.h2}>Analyze</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Content analysis — summarize, explain, review, extract key points, or perform sentiment analysis on any text.
            </p>

            <h3 style={S.h3}><span style={S.method('POST')}>POST</span> /v1/analyze</h3>
            <ParamsTable params={[
              { name: 'type',    type: "'summarize' | 'explain' | 'review' | 'extract' | 'sentiment'", required: true,  desc: 'Analysis type' },
              { name: 'content', type: 'string',  required: true,  desc: 'The content to analyze (max 20 000 chars)' },
              { name: 'context', type: 'string',  required: false, desc: 'Background context about the content (max 2000 chars)' },
              { name: 'focus',   type: 'string',  required: false, desc: 'Specific aspect to focus on (max 500 chars)' },
            ]} />
            <CodeBlock lang="bash">
{`curl https://nikita.wokspec.org/api/v1/analyze \\
  -H "Authorization: Bearer eral_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "summarize",
    "content": "The report found that...",
    "focus": "key financial risks"
  }'`}
            </CodeBlock>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "result": "The report identifies three main financial risks: ...",
    "type": "summarize",
    "model": { "provider": "openai", "model": "gpt-4o" }
  },
  "error": null
}`}
            </CodeBlock>
          </section>

          {/* ── Studio ── */}
          <section id= "studio">
            <h2 style={S.h2}>Studio Prompts</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Generate highly optimized image generation prompts for use in Studio — tailored for Stable Diffusion, FLUX, and ComfyUI pipelines.
            </p>

            <h3 style={S.h3}><span style={S.method('POST')}>POST</span> /v1/studio/prompt</h3>
            <ParamsTable params={[
              { name: 'description', type: 'string',  required: true,  desc: 'What you want to generate (max 2000 chars)' },
              { name: 'style',       type: "'pixel-art' | 'isometric' | 'flat-icon' | 'concept-art' | 'sprite-sheet' | 'ui-asset'", required: false, desc: 'Asset style', default: 'pixel-art' },
              { name: 'palette',     type: 'string',  required: false, desc: "Color palette or mood (e.g. 'warm sunset', 'neon cyberpunk')" },
              { name: 'resolution',  type: "'16x16' | '32x32' | '64x64' | '128x128' | '256x256' | 'free'", required: false, desc: 'Target resolution', default: 'free' },
              { name: 'count',       type: 'integer', required: false, desc: 'Number of prompt variations (1–5)', default: '1' },
            ]} />
            <CodeBlock lang="bash">
{`curl https://nikita.wokspec.org/api/v1/studio/prompt \\
  -H "Authorization: Bearer eral_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "A medieval castle surrounded by a moat at sunset",
    "style": "pixel-art",
    "resolution": "128x128",
    "palette": "warm amber and stone grey",
    "count": 2
  }'`}
            </CodeBlock>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "prompts": "1. Detailed pixel art castle, 128x128...\n2. Isometric pixel castle at dusk...",
    "style": "pixel-art",
    "model": { "provider": "openai", "model": "gpt-4o" }
  },
  "error": null
}`}
            </CodeBlock>
          </section>

          {/* ── Keys ── */}
          <section id="keys">
            <h2 style={S.h2}>API Keys</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Manage long-lived API keys for embedding or server-to-server use.
              Key management endpoints require a <strong>WokSpec JWT</strong> — API keys cannot manage other API keys.
            </p>

            <h3 style={S.h3}><span style={S.method('GET')}>GET</span> /v1/keys</h3>
            <p style={{ ...S.muted, marginBottom: '0.75rem' }}>List all keys belonging to the authenticated user.</p>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "keys": [
      { "id": "eral_abc123…", "name": "My Website", "createdAt": "2026-03-01T12:00:00Z" }
    ]
  },
  "error": null
}`}
            </CodeBlock>

            <h3 style={S.h3}><span style={S.method('POST')}>POST</span> /v1/keys</h3>
            <ParamsTable params={[
              { name: 'name', type: 'string', required: true, desc: 'Human label for the key (max 100 chars)' },
            ]} />
            <p style={{ color: '#f59e0b', fontSize: '0.8125rem', marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              ⚠ The full key value is only returned in this response. Store it securely — it cannot be retrieved again.
            </p>
            <CodeBlock lang="json — response">
{`{
  "data": {
    "key": "eral_AbCdEfGhIjKlMnOpQrStUvWxYz…",
    "id": "eral_AbCdEfGh…"
  },
  "error": null
}`}
            </CodeBlock>

            <h3 style={S.h3}><span style={S.method('DELETE')}>DELETE</span> /v1/keys/:id</h3>
            <p style={{ ...S.muted, marginBottom: '0.75rem' }}>Permanently revoke an API key. The key stops working immediately.</p>
            <CodeBlock lang="json — response">
{`{ "data": { "ok": true }, "error": null }`}
            </CodeBlock>
          </section>

          {/* ── Widget ── */}
          <section id="widget">
            <h2 style={S.h2}>Widget Embed</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Add an AI chat widget to any website with a single <code style={S.inlineCode}>&lt;script&gt;</code> tag.
              No framework required — pure vanilla JS, ~10KB, zero dependencies.
            </p>

            <h3 style={S.h3}>Script tag (recommended)</h3>
            <CodeBlock lang="html">
{`<script
  src="https://nikita.wokspec.org/api/widget.js"
  data-nikita-key="eral_your_key_here"
  data-nikita-name="Nikita"
  data-nikita-color="#7c3aed"
  data-nikita-position="bottom-right"
  data-nikita-greeting="Hi! How can I help?"
></script>`}
            </CodeBlock>

            <h3 style={S.h3}>Data attributes</h3>
            <ParamsTable params={[
              { name: 'data-nikita-key',      type: 'string', required: true,  desc: 'Your Nikita API key' },
              { name: 'data-nikita-name',     type: 'string', required: false, desc: 'Display name shown in the widget header', default: 'Nikita' },
              { name: 'data-nikita-color',    type: 'string', required: false, desc: 'Brand color (hex)', default: '#7c3aed' },
              { name: 'data-nikita-position', type: "'bottom-right' | 'bottom-left'", required: false, desc: 'Widget position on screen', default: 'bottom-right' },
              { name: 'data-nikita-greeting', type: 'string', required: false, desc: 'Initial message shown in the chat', default: "Hi! I'm Nikita…" },
              { name: 'data-nikita-placeholder', type: 'string', required: false, desc: 'Input placeholder text', default: 'Ask me anything...' },
            ]} />

            <h3 style={S.h3}>Imperative API</h3>
            <p style={{ ...S.muted, marginBottom: '0.75rem' }}>
              After the script loads, <code style={S.inlineCode}>window.Nikita</code> exposes an imperative API:
            </p>
            <CodeBlock lang="javascript">
{`// Init programmatically (skips data-attribute auto-init)
window.Nikita.init({
  apiKey:    'eral_...',
  name:      'Nikita',
  color:     '#7c3aed',
  position:  'bottom-right',
  greeting:  'Hi! How can I help?',
});

window.Nikita.open();     // open the chat panel
window.Nikita.close();    // close the chat panel
window.Nikita.destroy();  // remove from DOM`}
            </CodeBlock>
          </section>

          {/* ── Errors ── */}
          <section id="errors">
            <h2 style={S.h2}>Errors</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              All errors follow a consistent shape. HTTP status codes match the <code style={S.inlineCode}>error.status</code> field.
            </p>
            <CodeBlock lang="json — error response">
{`{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header",
    "status": 401
  }
}`}
            </CodeBlock>
            <div style={S.card}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Code</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'UNAUTHORIZED',    status: 401, msg: 'Missing or invalid credential' },
                    { code: 'FORBIDDEN',       status: 403, msg: 'Valid credential but insufficient permission' },
                    { code: 'NOT_FOUND',       status: 404, msg: 'Resource or route does not exist' },
                    { code: 'RATE_LIMITED',    status: 429, msg: 'Too many requests — back off and retry' },
                    { code: 'VALIDATION_ERROR',status: 400, msg: 'Request body failed schema validation' },
                    { code: 'AI_ERROR',        status: 500, msg: 'AI provider returned an error or timed out' },
                    { code: 'INTERNAL_ERROR',  status: 500, msg: 'Unexpected server error' },
                  ].map(({ code, status, msg }) => (
                    <tr key={code}>
                      <td style={{ ...S.td, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#f87171' }}>{code}</td>
                      <td style={{ ...S.td, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>{status}</td>
                      <td style={{ ...S.td, color: 'var(--muted)', fontSize: '0.85rem' }}>{msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Rate Limits ── */}
          <section id="limits">
            <h2 style={S.h2}>Rate Limits</h2>
            <hr style={S.divider} />
            <p style={S.muted}>
              Rate limits are enforced per credential (API key or user JWT) using a sliding window in Cloudflare KV.
              Exceeded limits return <code style={S.inlineCode}>429 RATE_LIMITED</code>.
            </p>
            <div style={S.card}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Endpoint group</th>
                    <th style={S.th}>Limit</th>
                    <th style={S.th}>Window</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { group: '/v1/chat',           limit: '30 req',  window: '1 min' },
                    { group: '/v1/generate',        limit: '20 req',  window: '1 min' },
                    { group: '/v1/analyze',         limit: '30 req',  window: '1 min' },
                    { group: '/v1/studio/prompt',   limit: '20 req',  window: '1 min' },
                    { group: '/v1/keys',            limit: '10 req',  window: '1 min' },
                  ].map(({ group, limit, window: w }) => (
                    <tr key={group}>
                      <td style={{ ...S.td, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{group}</td>
                      <td style={{ ...S.td, color: accent, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{limit}</td>
                      <td style={{ ...S.td, color: 'var(--muted)', fontSize: '0.85rem' }}>{w}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...S.muted, marginTop: '1rem', fontSize: '0.85rem' }}>
              Higher rate limits are available on paid WokSpec plans. Contact <code style={S.inlineCode}>support@wokspec.org</code> for enterprise quotas.
            </p>
          </section>

        </main>
      </div>
    </div>
  );
}
