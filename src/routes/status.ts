import { Hono } from 'hono';
import type { Env } from '../types';
import { KNOWN_PRODUCTS } from '../lib/context';

const status = new Hono<{ Bindings: Env }>();
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_GROQ_MODEL = 'llama3-70b-8192';
const DEFAULT_CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DEFAULT_CF_FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

function routeModels(c: { env: Env }) {
  const groq = c.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  return {
    chat: {
      cloudflare: c.env.CF_AI_CHAT_MODEL ?? c.env.CF_AI_MODEL ?? DEFAULT_CF_MODEL,
      openai: c.env.OPENAI_CHAT_MODEL ?? c.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      groq,
    },
    generate: {
      cloudflare: c.env.CF_AI_GENERATE_MODEL ?? c.env.CF_AI_MODEL ?? DEFAULT_CF_MODEL,
      openai: c.env.OPENAI_GENERATE_MODEL ?? c.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      groq,
    },
    analyze: {
      cloudflare: c.env.CF_AI_ANALYZE_MODEL ?? c.env.CF_AI_MODEL ?? DEFAULT_CF_MODEL,
      openai: c.env.OPENAI_ANALYZE_MODEL ?? c.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      groq,
    },
    studio: {
      cloudflare: c.env.CF_AI_STUDIO_MODEL ?? c.env.CF_AI_GENERATE_MODEL ?? c.env.CF_AI_MODEL ?? DEFAULT_CF_MODEL,
      openai: c.env.OPENAI_STUDIO_MODEL ?? c.env.OPENAI_GENERATE_MODEL ?? c.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      groq,
    },
    cloudflare_fallback: c.env.CF_AI_FALLBACK_MODEL ?? DEFAULT_CF_FALLBACK_MODEL,
  };
}

// GET /v1/status
status.get('/', async (c) => {
  const hasOpenAI = Boolean(c.env.OPENAI_API_KEY);
  const hasGroq = Boolean(c.env.GROQ_API_KEY);
  const hasCFAI = Boolean(c.env.AI);
  const hasMemory = Boolean(c.env.KV_MEMORY);
  const hasApiKeys = Boolean(c.env.KV_API_KEYS);
  const spendMode = c.env.AI_SPEND_MODE ?? 'free-only';
  const preferredProvider = c.env.AI_PROVIDER === 'groq'
    ? (spendMode === 'free-only' && hasCFAI ? 'cloudflare' : 'groq')
    : c.env.AI_PROVIDER === 'openai'
      ? (spendMode === 'free-only' && hasCFAI ? 'cloudflare' : 'openai')
      : hasCFAI
        ? 'cloudflare'
        : hasGroq && spendMode !== 'free-only'
          ? 'groq'
          : hasOpenAI && spendMode !== 'free-only'
            ? 'openai'
            : 'none';
  const preferredModel = preferredProvider === 'cloudflare'
    ? (c.env.CF_AI_MODEL ?? DEFAULT_CF_MODEL)
    : preferredProvider === 'openai'
      ? (c.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL)
      : preferredProvider === 'groq'
        ? (c.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL)
        : null;

  return c.json({
    data: {
      service: 'Nikita',
      version: '0.4.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: {
        chat: true,
        generate: true,
        analyze: true,
        studio: true,
        widget: true,
        browser_extension: true,
        generic_integration_context: true,
        text_transformations: true,
        quality_controls: true,
        supercharged: hasGroq,
      },
      ai: {
        provider: preferredProvider,
        model: preferredModel,
        spend_mode: spendMode,
        fallback_available: hasCFAI,
        paid_fallback_enabled: spendMode !== 'free-only' && (hasOpenAI || hasGroq),
        configured: {
          openai: hasOpenAI,
          groq: hasGroq,
          cloudflare: hasCFAI,
        },
        route_models: routeModels(c),
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
