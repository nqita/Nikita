import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser, EralAuth, ApiKeyScope } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { createApiKey, listApiKeys, revokeApiKey } from '../lib/api-keys';

const keys = new Hono<{ Bindings: Env; Variables: { user: EralUser; auth: EralAuth } }>();

// All key management requires JWT auth
keys.use('*', requireAuth());

// Extra guard: API keys cannot manage other keys
keys.use('*', async (c, next) => {
  const auth = c.get('auth');
  if (auth?.method === 'apikey') {
    return c.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'API keys cannot manage other API keys — use a WokSpec JWT', status: 403 } },
      403
    );
  }
  await next();
});

// POST /v1/keys — create a new API key
keys.post(
  '/',
  rateLimit('keys'),
  zValidator('json', z.object({
    name:   z.string().min(1).max(100).describe('Human label e.g. "My Website" or "Discord Bot"'),
    scopes: z.array(z.enum(['chat', 'generate', 'analyze', 'studio', '*'])).default(['*']),
  })),
  async (c) => {
    const user = c.get('user');
    const { name, scopes } = c.req.valid('json');

    if (!c.env.KV_API_KEYS) {
      return c.json(
        { data: null, error: { code: 'NOT_CONFIGURED', message: 'API key storage not configured', status: 503 } },
        503
      );
    }

    const { key, record } = await createApiKey(
      c.env.KV_API_KEYS,
      user.id,
      name,
      scopes as ApiKeyScope[]
    );

    return c.json({
      data: {
        key,   // shown ONCE — store it securely
        record,
        warning: 'Store this key securely. It will not be shown again.',
      },
      error: null,
    }, 201);
  }
);

// GET /v1/keys — list all API keys for the authenticated user
keys.get('/', async (c) => {
  const user = c.get('user');
  const records = await listApiKeys(c.env.KV_API_KEYS, user.id);
  return c.json({ data: { keys: records }, error: null });
});

// DELETE /v1/keys/:id — revoke an API key
keys.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const ok = await revokeApiKey(c.env.KV_API_KEYS, user.id, id);
  if (!ok) {
    return c.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'API key not found', status: 404 } },
      404
    );
  }
  return c.json({ data: { ok: true }, error: null });
});

export { keys as keysRouter };
