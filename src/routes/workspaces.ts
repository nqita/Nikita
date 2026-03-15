import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, EralUser } from '../types';
import { requireAuth } from '../middleware';

const workspaces = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
workspaces.use('*', requireAuth('*'));

// GET /v1/workspaces — List user's workspaces
workspaces.get('/', async (c) => {
  // In a real app, we'd fetch from KV or a database
  // For now, we return a mock structure matching the v1 vision
  return c.json({
    data: {
      workspaces: [
        {
          id: 'ws-default',
          name: 'Personal Workspace',
          role: 'owner',
          projects: [
            { id: 'proj-nikita', name: 'Nikita AI' },
            { id: 'proj-studio', name: 'Studio Assets' }
          ]
        }
      ]
    },
    error: null
  });
});

// POST /v1/workspaces — Create a new workspace
workspaces.post(
  '/',
  zValidator('json', z.object({
    name: z.string().min(1).max(100),
  })),
  async (c) => {
    const { name } = c.req.valid('json');
    return c.json({
      data: {
        id: `ws-${crypto.randomUUID().slice(0, 8)}`,
        name,
        role: 'owner',
        createdAt: new Date().toISOString()
      },
      error: null
    });
  }
);

export { workspaces as workspacesRouter };
