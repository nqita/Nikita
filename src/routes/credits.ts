import { Hono } from 'hono';
import type { Env, EralUser } from '../types';
import { requireAuth } from '../middleware';
import { getUserCredits } from '../lib/credits';

const credits = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
credits.use('*', requireAuth('*'));

// GET /v1/credits — Get current user's credit balance and plan
credits.get('/', async (c) => {
  const user = c.get('user');
  const userCredits = await getUserCredits(c.env.KV_CREDITS, user.id);
  
  return c.json({
    data: userCredits,
    error: null
  });
});

export { credits as creditsRouter };
