import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser, GenerateType } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { run, eralSystemPrompt } from '../lib/openai';
import { buildContext, IntegrationSchema, ProductSchema, productPromptExtras } from '../lib/context';

const generate = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
generate.use('*', requireAuth('generate'));

const GENERATE_INSTRUCTIONS: Record<GenerateType, string> = {
  post:    'Write a compelling social media post for a developer/builder audience. Be authentic, concise, and engaging. Include relevant hashtags at the end.',
  caption: 'Write a short, punchy caption suitable for an image or video. Keep it under 150 characters if possible.',
  code:    'Write clean, well-commented code. Follow best practices for the language or framework mentioned. Include a brief explanation after the code block.',
  prompt:  'Write a detailed AI image generation prompt. Be descriptive about style, lighting, composition, colors, and mood. Format as a single flowing description.',
  docs:    'Write clear, developer-friendly documentation. Use markdown formatting with headers, code blocks, and examples where appropriate.',
  email:   'Write a professional but friendly email. Keep it concise and action-oriented.',
  summary: 'Write a concise summary that captures the key points. Use bullet points for clarity.',
  rewrite: 'Rewrite the material so it is clearer, cleaner, and more natural while preserving the original meaning.',
  expand:  'Expand the material into a more complete draft. If the input is a brief or instruction, turn it into polished finished content instead of describing what you would write.',
  shorten: 'Shorten the material aggressively while keeping the core meaning, key facts, and intended tone.',
  improve: 'Improve the material for clarity, structure, tone, and polish while keeping the author intent intact.',
};

const GenerateSchema = z.object({
  type: z.enum(['post', 'caption', 'code', 'prompt', 'docs', 'email', 'summary', 'rewrite', 'expand', 'shorten', 'improve']),
  topic: z.string().trim().min(1).max(2000).optional().describe('What to generate content about'),
  content: z.string().trim().min(1).max(12000).optional().describe('Existing content or a brief to transform'),
  prompt: z.string().trim().min(1).max(4000).optional().describe('Short instruction or brief'),
  context: z.string().max(8000).optional().describe('Additional context or existing content'),
  tone: z.enum(['professional', 'casual', 'technical', 'playful']).default('casual'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
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
    const { type, topic, content, prompt, context, tone, length, product, integration } = c.req.valid('json');
    const sourceMaterial = [topic, prompt, content].find((value) => Boolean(value?.trim())) ?? '';
    const transformMode = ['rewrite', 'expand', 'shorten', 'improve'].includes(type);

    const lengthGuidance: Record<string, string> = {
      short:  'Keep it brief — under 100 words.',
      medium: 'Aim for 100–300 words.',
      long:   'Be comprehensive — 300+ words, with examples where helpful.',
    };

    const toneGuidance: Record<string, string> = {
      professional: 'Use a professional, polished tone.',
      casual:       'Use a casual, conversational tone — like a builder talking to fellow builders.',
      technical:    'Use precise technical language. Assume an experienced developer audience.',
      playful:      'Use a fun, energetic tone with personality.',
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
          content: result.content,
          model: result.model,
        },
        error: null,
      });
    } catch (err) {
      console.error('[Eral/generate] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'Generation failed', status: 500 } },
        500
      );
    }
  }
);

export { generate as generateRouter };
