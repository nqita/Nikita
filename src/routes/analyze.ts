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
  summarize: 'Generate a precise technical summary. Focus on core objectives and technical outcomes. Do not use emojis.',
  explain:   'Provide a technical explanation of the content. Use professional terminology and focus on architectural or logic-based clarity. Do not use emojis.',
  review:    'Perform a critical technical review. Identify logic errors, architectural weaknesses, security implications, and potential optimizations. Do not use emojis.',
  extract:   'Identify and list key technical requirements, action items, or data points. Use structured formatting. Do not use emojis.',
  sentiment: 'Analyze technical sentiment and professional tone. Identify indicators of confidence, risk, or urgency in the provided text. Do not use emojis.',
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
    quality: z.enum(['fast', 'balanced', 'best']).optional(),
    systemHint: z.string().max(1000).optional().describe('Additional system-level instructions'),
    product: ProductSchema,
    integration: IntegrationSchema,
  })),
  async (c) => {
    const user = c.get('user');
    const { type, content, context, focus, quality, systemHint, product, integration } = c.req.valid('json');
    const resolvedQuality = quality ?? (type === 'review' || type === 'explain' ? 'best' : 'balanced');

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
          route: 'analyze',
          quality: resolvedQuality,
        },
        {
          openaiApiKey: c.env.OPENAI_API_KEY,
          groqApiKey: c.env.GROQ_API_KEY,
          cfAI: c.env.AI,
          preferredProvider: c.env.AI_PROVIDER,
          spendMode: c.env.AI_SPEND_MODE,
          openaiModel: c.env.OPENAI_MODEL,
          openaiAnalyzeModel: c.env.OPENAI_ANALYZE_MODEL,
          groqModel: c.env.GROQ_MODEL,
          cfModel: c.env.CF_AI_MODEL,
          cfAnalyzeModel: c.env.CF_AI_ANALYZE_MODEL,
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
      console.error('[Nikita/analyze] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'Analysis failed', status: 500 } },
        500
      );
    }
  }
);

export { analyze as analyzeRouter };
