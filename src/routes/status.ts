import { Hono } from 'hono';
import type { Env } from '../types';
import { KNOWN_PRODUCTS } from '../lib/context';

const status = new Hono<{ Bindings: Env }>();

// GET /v1/status
status.get('/', async (c) => {
  const hasOpenAI = Boolean(c.env.OPENAI_API_KEY);
  const hasCFAI = Boolean(c.env.AI);
  const hasMemory = Boolean(c.env.KV_MEMORY);
  const hasApiKeys = Boolean(c.env.KV_API_KEYS);
  const preferredProvider = c.env.AI_PROVIDER === 'openai'
    ? 'openai'
    : hasCFAI
      ? 'cloudflare'
      : hasOpenAI
        ? 'openai'
        : 'none';
  const preferredModel = preferredProvider === 'cloudflare'
    ? (c.env.CF_AI_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast')
    : preferredProvider === 'openai'
      ? (c.env.OPENAI_MODEL ?? 'gpt-4o')
      : null;

  return c.json({
    data: {
      service: 'Eral',
      version: '0.2.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: {
        chat: true,
        generate: true,
        analyze: true,
        wokgen: true,
        widget: true,
        browser_extension: true,
        generic_integration_context: true,
        text_transformations: true,
      },
      ai: {
        provider: preferredProvider,
        model: preferredModel,
        fallback_available: hasCFAI,
        configured: {
          openai: hasOpenAI,
          cloudflare: hasCFAI,
        },
      },
      memory: {
        enabled: hasMemory,
      },
      integrations: {
        api_keys: hasApiKeys,
        supported_products: [...KNOWN_PRODUCTS],
        accepts_product_hint: true,
        accepts_integration_metadata: true,
      },
    },
    error: null,
  });
});

export { status as statusRouter };
