import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { securityHeaders, requestId } from './middleware';
import { chatRouter } from './routes/chat';
import { generateRouter } from './routes/generate';
import { analyzeRouter } from './routes/analyze';
import { statusRouter } from './routes/status';
import { keysRouter } from './routes/keys';
import { toolsRouter } from './routes/tools';
import { workspacesRouter } from './routes/workspaces';
import { creditsRouter } from './routes/credits';
// @ts-ignore — imported as text blob via wrangler [[rules]]
import WIDGET_BUNDLE from '../dist/nikita-widget.txt';

const app = new Hono<{ Bindings: Env }>();

// ===== MIDDLEWARE =====
app.use('*', requestId());
app.use('*', securityHeaders());

// CORS — WokSpec products and browser extensions use the allowlist.
// External sites using an API key may come from any origin.
app.use('*', cors({
  origin: (origin, c) => {
    const isWokSpec = origin?.endsWith('.wokspec.org') || origin === 'https://wokspec.org';
    const isDev = c.env.ENVIRONMENT !== 'production' && (origin?.includes('localhost') || origin?.includes('127.0.0.1'));
    const isExtension = origin?.startsWith('chrome-extension://') || origin?.startsWith('moz-extension://');

    if (isWokSpec || isDev || isExtension) return origin;

    // Allow any origin — API key auth provides the security boundary for external sites.
    // The Authorization header check in middleware enforces auth regardless of origin.
    return origin ?? '*';
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Nikita-Source', 'X-Nikita-Anon-Id'],
  credentials: true,
}));

// ===== INFO =====
app.get('/', (c) => c.json({
  service: 'Nikita',
  description: 'Nikita powers WokSpec AI: context-aware agents that understand your workspace and act across web + internal apps.',
  version: '1.0.0',
  docs: 'https://nikita.wokspec.org/docs',
  auth: 'WokSpec JWT or Nikita API key',
  endpoints: {
    chat:       'POST /api/v1/chat',
    generate:   'POST /api/v1/generate',
    analyze:    'POST /api/v1/analyze',
    keys:       'GET|POST|DELETE /api/v1/keys',
    tools:      'GET /api/v1/tools',
    workspaces: 'GET|POST /api/v1/workspaces',
    credits:    'GET /api/v1/credits',
    status:     'GET /api/v1/status',
    widget:     'GET /api/widget.js',
  },
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===== ROUTES =====
// Mount at both /v1/* (workers.dev direct) and /api/v1/* (custom domain CF route)
const routes = [
  { path: '/v1/chat', router: chatRouter },
  { path: '/v1/generate', router: generateRouter },
  { path: '/v1/analyze', router: analyzeRouter },
  { path: '/v1/status', router: statusRouter },
  { path: '/v1/keys', router: keysRouter },
  { path: '/v1/tools', router: toolsRouter },
  { path: '/v1/workspaces', router: workspacesRouter },
  { path: '/v1/credits', router: creditsRouter },
];

for (const r of routes) {
  app.route(r.path, r.router);
  app.route(`/api${r.path}`, r.router);
}

// widget.js — serve the pre-built IIFE bundle directly
const WIDGET_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  'Access-Control-Allow-Origin': '*',
};
app.get('/widget.js', () => new Response(WIDGET_BUNDLE as string, { headers: WIDGET_HEADERS }));
app.get('/api/widget.js', () => new Response(WIDGET_BUNDLE as string, { headers: WIDGET_HEADERS }));

// ===== ERROR HANDLERS =====
app.notFound((c) =>
  c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found', status: 404 } }, 404)
);

app.onError((err, c) => {
  console.error('[Nikita Error]', err);
  return c.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } },
    500
  );
});

export default app;
