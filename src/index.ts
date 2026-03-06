import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { securityHeaders, requestId } from './middleware';
import { chatRouter } from './routes/chat';
import { generateRouter } from './routes/generate';
import { analyzeRouter } from './routes/analyze';
import { wokgenRouter } from './routes/wokgen';
import { statusRouter } from './routes/status';
import { keysRouter } from './routes/keys';
// @ts-ignore — imported as text blob via wrangler [[rules]]
import WIDGET_BUNDLE from '../dist/eral-widget.txt';

const app = new Hono<{ Bindings: Env }>();

// ===== MIDDLEWARE =====
app.use('*', requestId());
app.use('*', securityHeaders());

// CORS — WokSpec products and browser extensions use the allowlist.
// External sites using an API key may come from any origin.
app.use('*', cors({
  origin: (origin, c) => {
    const wokspecOrigins = [
      'https://wokspec.org',
      'https://www.wokspec.org',
      'https://wokgen.wokspec.org',
      'https://wokpost.wokspec.org',
      'https://chopsticks.wokspec.org',
      'https://eral.wokspec.org',
    ];
    // Always allow WokSpec origins
    if (wokspecOrigins.includes(origin ?? '')) return origin;
    // Always allow browser extensions
    if (origin?.startsWith('chrome-extension://') || origin?.startsWith('moz-extension://')) return origin;
    // Allow localhost in dev
    if (c.env.ENVIRONMENT !== 'production' && origin?.includes('localhost')) return origin;
    // Allow any origin — API key auth provides the security boundary for external sites.
    // The Authorization header check in middleware enforces auth regardless of origin.
    return origin ?? '*';
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Eral-Source'],
  credentials: true,
}));

// ===== INFO =====
app.get('/', (c) => c.json({
  service: 'Eral',
  description: 'WokSpec AI — embed intelligent chat, generation & analysis into any product',
  version: '0.2.0',
  docs: 'https://eral.wokspec.org/docs',
  auth: 'WokSpec JWT  or  Eral API key (Authorization: Bearer <token>)',
  endpoints: {
    chat:     'POST /api/v1/chat',
    generate: 'POST /api/v1/generate',
    analyze:  'POST /api/v1/analyze',
    wokgen:   'POST /api/v1/wokgen/prompt',
    keys:     'GET|POST|DELETE /api/v1/keys',
    status:   'GET  /api/v1/status',
    widget:   'GET  /api/widget.js',
  },
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===== ROUTES =====
// Mount at both /v1/* (workers.dev direct) and /api/v1/* (custom domain CF route)
app.route('/v1/chat', chatRouter);
app.route('/v1/generate', generateRouter);
app.route('/v1/analyze', analyzeRouter);
app.route('/v1/wokgen', wokgenRouter);
app.route('/v1/status', statusRouter);
app.route('/v1/keys', keysRouter);

app.route('/api/v1/chat', chatRouter);
app.route('/api/v1/generate', generateRouter);
app.route('/api/v1/analyze', analyzeRouter);
app.route('/api/v1/wokgen', wokgenRouter);
app.route('/api/v1/status', statusRouter);
app.route('/api/v1/keys', keysRouter);

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
  console.error('[Eral Error]', err);
  return c.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } },
    500
  );
});

export default app;
