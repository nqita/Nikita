import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser, AnalyzeType } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { run, eralSystemPrompt } from '../lib/openai';
import { buildContext, IntegrationSchema, ProductSchema, productPromptExtras } from '../lib/context';

const analyze = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
analyze.use('*', requireAuth('analyze'));

const ANALYZE_INSTRUCTIONS: Record<AnalyzeType, string> = {
  summarize: 'Provide a clear, concise summary of the following content. Capture the main ideas without losing important details.',
  explain:   'Explain the following content in plain language. Assume no prior knowledge — make it accessible to a non-expert.',
  review:    'Review the following content critically. Identify strengths, weaknesses, potential improvements, and any issues (bugs, logic errors, missing edge cases, or unclear writing).',
  extract:   'Extract and list the key points, facts, or action items from the following content. Use a clean bullet-point format.',
  sentiment: 'Analyze the tone and sentiment of the following content. Identify whether it is positive, negative, or neutral, and explain what signals indicate that tone.',
};

// POST /v1/analyze
analyze.post(
  '/',
  rateLimit('analyze'),
  zValidator('json', z.object({
    type:    z.enum(['summarize', 'explain', 'review', 'extract', 'sentiment']),
    content: z.string().min(1).max(20000).describe('The content to analyze'),
    context: z.string().max(2000).optional().describe('Additional context about the content'),
    focus:   z.string().max(500).optional().describe('Specific aspect to focus on'),
    systemHint: z.string().max(1000).optional().describe('Additional system-level instructions'),
    product: ProductSchema,
    integration: IntegrationSchema,
  })),
  async (c) => {
    const user = c.get('user');
    const { type, content, context, focus, systemHint, product, integration } = c.req.valid('json');

    const promptExtras = productPromptExtras(product, integration);
    const userContext = buildContext({ user, product, integration });
    const systemPrompt = eralSystemPrompt(
      [
        `You are performing a ${type} analysis for ${user.displayName}.`,
        promptExtras,
        systemHint,
        `User context:\n${userContext}`,
      ].filter(Boolean).join('\n\n')
    );

    const userMessage = [
      ANALYZE_INSTRUCTIONS[type as AnalyzeType],
      context ? `\nContext: ${context}` : '',
      focus ? `\nFocus specifically on: ${focus}` : '',
      `\n---\n${content}\n---`,
    ].filter(Boolean).join('\n');

    try {
      const result = await run(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          maxTokens: 1500,
          temperature: type === 'review' ? 0.4 : 0.6,
        },
        {
          openaiApiKey: c.env.OPENAI_API_KEY,
          cfAI: c.env.AI,
          preferredProvider: c.env.AI_PROVIDER,
          openaiModel: c.env.OPENAI_MODEL,
          cfModel: c.env.CF_AI_MODEL,
          cfFallbackModel: c.env.CF_AI_FALLBACK_MODEL,
        }
      );

      return c.json({
        data: {
          type,
          analysis: result.content,
          model: result.model,
        },
        error: null,
      });
    } catch (err) {
      console.error('[Eral/analyze] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'Analysis failed', status: 500 } },
        500
      );
    }
  }
);

export { analyze as analyzeRouter };
