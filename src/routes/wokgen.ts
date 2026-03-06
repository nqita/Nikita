import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser } from '../types';
import { requireAuth, rateLimit } from '../middleware';
import { run, eralSystemPrompt } from '../lib/openai';

const wokgen = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
wokgen.use('*', requireAuth('wokgen'));

// POST /v1/wokgen/prompt
// Generates optimized asset/image prompts for use in WokGen.
wokgen.post(
  '/prompt',
  rateLimit('wokgen'),
  zValidator('json', z.object({
    description: z.string().min(1).max(2000).describe('What you want to generate'),
    style: z.enum([
      'pixel-art',
      'isometric',
      'flat-icon',
      'concept-art',
      'sprite-sheet',
      'ui-asset',
    ]).default('pixel-art'),
    palette: z.string().max(200).optional().describe('Color palette or mood (e.g. "warm sunset", "neon cyberpunk")'),
    resolution: z.enum(['16x16', '32x32', '64x64', '128x128', '256x256', 'free']).default('free'),
    count: z.number().int().min(1).max(5).default(1).describe('Number of prompt variations to generate'),
  })),
  async (c) => {
    const user = c.get('user');
    const { description, style, palette, resolution, count } = c.req.valid('json');

    const styleGuides: Record<string, string> = {
      'pixel-art':    'classic pixel art with clean pixels, limited color palette, retro game aesthetic',
      'isometric':    'isometric pixel art, 2.5D perspective, clean geometry, game-ready',
      'flat-icon':    'flat design icon, minimal, clean lines, modern UI style',
      'concept-art':  'digital concept art, detailed, painterly, high quality illustration',
      'sprite-sheet': 'sprite sheet ready, consistent style, multiple animation frames or variants',
      'ui-asset':     'UI/UX asset, clean, scalable, suitable for web and app interfaces',
    };

    const systemPrompt = eralSystemPrompt(
      'You are an expert AI image prompt engineer specializing in WokGen asset creation. Generate highly detailed, optimized prompts that produce the best results in AI image generation tools including ComfyUI and Stable Diffusion.'
    );

    const userMessage = [
      `Generate ${count} optimized image generation prompt${count > 1 ? 's' : ''} for WokGen.`,
      `Asset description: ${description}`,
      `Style: ${styleGuides[style]}`,
      palette ? `Color palette/mood: ${palette}` : '',
      resolution !== 'free' ? `Target resolution: ${resolution}` : '',
      '',
      'Format each prompt as a standalone, detailed description. If generating multiple, number them.',
      'Include: subject details, art style keywords, quality boosters, and negative elements to avoid.',
    ].filter(Boolean).join('\n');

    try {
      const result = await run(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          maxTokens: count * 400,
          temperature: 0.8,
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
          prompts: result.content,
          style,
          model: result.model,
        },
        error: null,
      });
    } catch (err) {
      console.error('[Eral/wokgen] Error:', err);
      return c.json(
        { data: null, error: { code: 'AI_ERROR', message: 'Prompt generation failed', status: 500 } },
        500
      );
    }
  }
);

export { wokgen as wokgenRouter };
