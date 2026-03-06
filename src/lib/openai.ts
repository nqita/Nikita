import type { Env, Message, ModelInfo } from '../types';

// ── Provider interface ────────────────────────────────────────────────────────

export interface RunOptions {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: false; // streaming handled separately
}

export interface RunResult {
  content: string;
  model: ModelInfo;
}

const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DEFAULT_CF_FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

// ── OpenAI GPT-4o ─────────────────────────────────────────────────────────────

async function runOpenAI(
  apiKey: string,
  options: RunOptions,
  model = DEFAULT_OPENAI_MODEL
): Promise<RunResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: { provider: 'openai', model, fallback: false },
  };
}

// ── Cloudflare Workers AI (fallback) ──────────────────────────────────────────

async function tryCloudflareModel(
  ai: Ai,
  model: string,
  options: RunOptions,
  fallback: boolean
): Promise<RunResult> {
  const result = await ai.run(model, {
    messages: options.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    max_tokens: options.maxTokens ?? 1024,
  }) as { response?: string };

  return {
    content: result.response ?? '',
    model: { provider: 'cloudflare', model, fallback },
  };
}

async function runCloudflareAI(
  ai: Ai,
  options: RunOptions,
  primaryModel = DEFAULT_CF_MODEL,
  fallbackModel = DEFAULT_CF_FALLBACK_MODEL
): Promise<RunResult> {
  try {
    return await tryCloudflareModel(ai, primaryModel, options, false);
  } catch (error) {
    if (!fallbackModel || fallbackModel === primaryModel) {
      throw error;
    }
    return tryCloudflareModel(ai, fallbackModel, options, true);
  }
}

// ── Unified run function ──────────────────────────────────────────────────────

/**
 * Run an inference request.
 * Uses OpenAI GPT-4o when an API key is available; falls back to Cloudflare
 * Workers AI. This abstraction lets us swap to Eral's own model in the future
 * by replacing the logic here without touching any route code.
 */
export async function run(
  options: RunOptions,
  providers: {
    openaiApiKey?: string;
    cfAI?: Ai;
    preferredProvider?: Env['AI_PROVIDER'];
    openaiModel?: string;
    cfModel?: string;
    cfFallbackModel?: string;
  }
): Promise<RunResult> {
  const providerOrder: Array<'cloudflare' | 'openai'> =
    providers.preferredProvider === 'openai'
      ? ['openai', 'cloudflare']
      : ['cloudflare', 'openai'];

  for (const provider of providerOrder) {
    if (provider === 'cloudflare' && providers.cfAI) {
      try {
        return await runCloudflareAI(
          providers.cfAI,
          options,
          providers.cfModel ?? DEFAULT_CF_MODEL,
          providers.cfFallbackModel ?? DEFAULT_CF_FALLBACK_MODEL
        );
      } catch (error) {
        if (!providers.openaiApiKey) throw error;
      }
    }

    if (provider === 'openai' && providers.openaiApiKey) {
      try {
        return await runOpenAI(
          providers.openaiApiKey,
          options,
          providers.openaiModel ?? DEFAULT_OPENAI_MODEL
        );
      } catch (error) {
        if (!providers.cfAI) throw error;
      }
    }
  }

  throw new Error('No AI provider configured. Set AI binding for Cloudflare AI or provide OPENAI_API_KEY.');
}

/** Build the shared Eral system prompt. */
export function eralSystemPrompt(extras?: string): string {
  return [
    'You are Eral, the intelligent AI assistant built for WokSpec and embeddable into any website, app, extension, agent, or API integration.',
    'You have deep knowledge of all WokSpec products:',
    '  • WokSite   — main hub, SSO, bookings, community (wokspec.org)',
    '  • WokAPI    — unified API layer with authentication for all products',
    '  • WokGen    — AI-powered asset generation: pixel art, images, media',
    '  • WokPost   — workflow-focused social media platform for builders',
    '  • Chopsticks — Discord bot for builder communities',
    '  • Eral      — that\'s you! The AI layer powering intelligence across WokSpec',
    '',
    'Be concise, helpful, and direct. You understand developer workflows, content creation, and building products.',
    'When integration context is supplied, treat it as authoritative and adapt your response to that product, page, and workflow.',
    'When referencing WokSpec products, suggest relevant features only when they are actually helpful.',
    extras ?? '',
  ].filter(Boolean).join('\n');
}
