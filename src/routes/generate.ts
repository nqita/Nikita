import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser, GenerateType } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { run, eralSystemPrompt } from '../lib/openai';
import { getMemory, appendMemory, clearMemory, listSessions } from '../lib/memory';
import { buildContext, IntegrationSchema, ProductSchema, productPromptExtras } from '../lib/context';

const generate = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
generate.use('*', requireAuth('generate'));

const GENERATE_INSTRUCTIONS: Record<GenerateType, string> = {
  post:    'Generate professional social media content for a technical audience. Focus on clarity, value, and builder-centric insights. Do not use emojis.',
  caption: 'Generate a direct, high-impact caption. Maximum 150 characters. Do not use emojis.',
  code:    'Generate production-ready, well-structured code. Adhere to established best practices and include essential technical commentary. Do not use emojis.',
  prompt:  'Generate a precise, technical description for AI image synthesis. Focus on composition, lighting, and specific artistic style directives. Do not use emojis.',
  docs:    'Generate clear, structured technical documentation. Use standard markdown headers and code blocks. Focus on utility and precision. Do not use emojis.',
  email:   'Generate a concise, professional business email. Focus on clear action items and formal tone. Do not use emojis.',
  summary: 'Generate a precise technical summary. Use structured bullet points for core insights. Do not use emojis.',
  rewrite: 'Refactor the provided text for maximum clarity and professional tone while maintaining original technical meaning. Do not use emojis.',
  expand:  'Develop the provided brief into a comprehensive technical draft. Focus on depth and professional articulation. Do not use emojis.',
  shorten: 'Condense the provided text to its essential technical points without loss of meaning. Do not use emojis.',
  improve: 'Enhance the provided text for professional structure, clarity, and technical precision. Do not use emojis.',
};

const GenerateSchema = z.object({
  type: z.enum(['post', 'caption', 'code', 'prompt', 'docs', 'email', 'summary', 'rewrite', 'expand', 'shorten', 'improve']),
  topic: z.string().trim().min(1).max(2000).optional().describe('What to generate content about'),
  content: z.string().trim().min(1).max(12000).optional().describe('Existing content or a brief to transform'),
  prompt: z.string().trim().min(1).max(4000).optional().describe('Short instruction or brief'),
  context: z.string().max(8000).optional().describe('Additional context or existing content'),
  tone: z.enum(['professional', 'casual', 'technical', 'playful']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  quality: z.enum(['fast', 'balanced', 'best']).optional(),
  product: ProductSchema,
  integration: IntegrationSchema,
}).superRefine((value, ctx) => {
  const hasInput = [value.topic, value.content, value.prompt].some((entry) => Boolean(entry?.trim()));
  if (!hasInput) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide at least one of topic, content, or prompt.',
      path: ['topic'],
    });
  }
});

// POST /v1/generate
generate.post(
  '/',
  rateLimit('generate'),
  zValidator('json', GenerateSchema),
  async (c) => {
    const user = c.get('user');
    const { type, topic, content, prompt, context, tone, length, quality, product, integration } = c.req.valid('json');
    const sourceMaterial = [topic, prompt, content].find((value) => Boolean(value?.trim())) ?? '';
    const transformMode = ['rewrite', 'expand', 'shorten', 'improve'].includes(type);
    const resolvedQuality = quality ?? (length === 'long' || transformMode ? 'best' : 'balanced');

    const lengthGuidance: Record<string, string> = {
      short:  'Constraint: Strictly under 100 words.',
      medium: 'Constraint: Approximately 150-250 words.',
      long:   'Constraint: Comprehensive analysis, 400+ words.',
    };

    const toneGuidance: Record<string, string> = {
      professional: 'Tone: Professional, direct, and business-focused.',
      casual:       'Tone: Direct and clear, using professional but accessible language.',
      technical:    'Tone: Highly technical and precise. Use industry-standard terminology.',
      playful:      'Tone: Engaging and energetic, while maintaining professional standards and avoiding fluff.',
    };

    const promptExtras = productPromptExtras(product, integration);
    const userContext = buildContext({ user, product, integration });
    const systemPrompt = eralSystemPrompt(
      [
        `You are handling a ${transformMode ? 'text transformation' : 'content generation'} task for ${user.displayName}.`,
        promptExtras,
        `User context:\n${userContext}`,
      ].filter(Boolean).join('\n\n')
    );

    const userMessage = transformMode
      ? [
          GENERATE_INSTRUCTIONS[type as GenerateType],
          toneGuidance[tone],
          lengthGuidance[length],
          context ? `Additional guidance:\n${context}` : '',
          `Source material / brief:\n${sourceMaterial}`,
        ].filter(Boolean).join('\n\n')
      : [
          `Generate a ${type} about: ${sourceMaterial}`,
          context ? `Context/Reference:\n${context}` : '',
          toneGuidance[tone],
          lengthGuidance[length],
          GENERATE_INSTRUCTIONS[type as GenerateType],
        ].filter(Boolean).join('\n\n');

    try {
      const result = await run(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          maxTokens: length === 'long' ? 2048 : length === 'medium' ? 1024 : 512,
          temperature: tone === 'playful' ? 0.9 : 0.7,
          route: 'generate',
          quality: resolvedQuality,
        },
        {
          openaiApiKey: c.env.OPENAI_API_KEY,
          groqApiKey: c.env.GROQ_API_KEY,
          cfAI: c.env.AI,
          preferredProvider: c.env.AI_PROVIDER,
          spendMode: c.env.AI_SPEND_MODE,
          openaiModel: c.env.OPENAI_MODEL,
          openaiGenerateModel: c.env.OPENAI_GENERATE_MODEL,
          groqModel: c.env.GROQ_MODEL,
          cfModel: c.env.CF_AI_MODEL,
          cfGenerateModel: c.env.CF_AI_GENERATE_MODEL,
          cfFallbackModel: c.env.CF_AI_FALLBACK_MODEL,
        }
      );

      return c.json({
        data: {
          type,
          content: result.content,
          model: result.model,
        },
        error: null,
      });
    } catch (err) {
      console.error('[Nikita/generate] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'Generation failed', status: 500 } },
        500
      );
    }
  }
);

export { generate as generateRouter };
