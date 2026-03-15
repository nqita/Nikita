import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser, EralAuth } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { run, eralSystemPrompt } from '../lib/openai';
import { getMemory, appendMemory, clearMemory, listSessions } from '../lib/memory';
import { buildContext, IntegrationSchema, ProductSchema, productPromptExtras } from '../lib/context';
import { deductCredits } from '../lib/credits';

const chat = new Hono<{ Bindings: Env; Variables: { user: EralUser; auth: EralAuth } }>();
chat.use('*', requireAuth('chat'));

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

// POST /v1/chat
// Main conversational endpoint with persistent memory per session.
chat.post(
  '/',
  rateLimit('chat'),
  zValidator('json', z.object({
    message:    z.string().min(1).max(4000),
    sessionId:  z.string().max(128).default('default'),
    quality:    z.enum(['fast', 'balanced', 'best']).optional(),
    product:    ProductSchema,
    integration: IntegrationSchema,
    pageContext: z.string().max(12000).optional(),
    history:    z.array(MessageSchema).max(10).optional(), // override — ignores stored memory
  })),
  async (c) => {
    const user = c.get('user');
    const auth = c.get('auth');
    const { message, sessionId, quality, product, integration, pageContext, history } = c.req.valid('json');

    // Deduct credits before running AI (unless authenticated via API Key which is currently unlimited)
    if (auth.method !== 'apikey') {
      const creditResult = await deductCredits(c.env.KV_CREDITS, user.id);
      if (!creditResult.ok) {
        return c.json(
          { data: null, error: { code: 'PAYMENT_REQUIRED', message: creditResult.error, status: creditResult.status } },
          creditResult.status as any
        );
      }
    }

    // Build context extras
    const userContext = buildContext({ user, product, integration, pageContext });
    const promptExtras = productPromptExtras(product, integration);

    const systemPrompt = eralSystemPrompt(
      [promptExtras, `User context:\n${userContext}`].filter(Boolean).join('\n\n')
    );

    // Use provided history override, or retrieve stored memory
    const pastMessages = history
      ? history.map((m) => ({ role: m.role, content: m.content }))
      : await getMemory(c.env.KV_MEMORY, user.id, sessionId);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...pastMessages,
      { role: 'user' as const, content: message },
    ];
    const resolvedQuality = quality ?? (messages.length > 8 ? 'best' : 'balanced');

    try {
      const result = await run(
        {
          messages,
          maxTokens: 1024,
          route: 'chat',
          quality: resolvedQuality,
        },
        {
          openaiApiKey: c.env.OPENAI_API_KEY,
          groqApiKey: c.env.GROQ_API_KEY,
          cfAI: c.env.AI,
          preferredProvider: c.env.AI_PROVIDER,
          spendMode: c.env.AI_SPEND_MODE,
          openaiModel: c.env.OPENAI_MODEL,
          openaiChatModel: c.env.OPENAI_CHAT_MODEL,
          groqModel: c.env.GROQ_MODEL,
          cfModel: c.env.CF_AI_MODEL,
          cfChatModel: c.env.CF_AI_CHAT_MODEL,
          cfFallbackModel: c.env.CF_AI_FALLBACK_MODEL,
        }
      );

      // Persist this exchange to memory (fire-and-forget)
      appendMemory(c.env.KV_MEMORY, user.id, sessionId, [
        { role: 'user', content: message },
        { role: 'assistant', content: result.content },
      ]).catch(() => { /* non-fatal */ });

      return c.json({
        data: {
          response: result.content,
          sessionId,
          model: result.model,
        },
        error: null,
      });
    } catch (err) {
      console.error('[Nikita/chat] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'AI request failed', status: 500 } },
        500
      );
    }
  }
);

// DELETE /v1/chat/:sessionId — clear a session's memory
chat.delete(
  '/:sessionId',
  async (c) => {
    const user = c.get('user');
    const sessionId = c.req.param('sessionId');
    await clearMemory(c.env.KV_MEMORY, user.id, sessionId);
    return c.json({ data: { ok: true }, error: null });
  }
);

// GET /v1/chat/sessions — list all active sessions for the user
chat.get('/sessions', async (c) => {
  const user = c.get('user');
  const sessions = await listSessions(c.env.KV_MEMORY, user.id);
  return c.json({ data: { sessions }, error: null });
});

// GET /v1/chat/:sessionId — retrieve memory for a session
chat.get(
  '/:sessionId',
  async (c) => {
    const user = c.get('user');
    const sessionId = c.req.param('sessionId');
    const messages = await getMemory(c.env.KV_MEMORY, user.id, sessionId);
    return c.json({ data: { sessionId, messages }, error: null });
  }
);

export { chat as chatRouter };
