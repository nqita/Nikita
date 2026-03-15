import { Hono } from 'hono';
import type { Env, EralUser } from '../types';
import { requireAuth } from '../middleware';

const tools = new Hono<{ Bindings: Env; Variables: { user: EralUser } }>();
tools.use('*', requireAuth('*'));

// GET /v1/tools — List available tools for Nikita agents
tools.get('/', async (c) => {
  return c.json({
    data: {
      tools: [
        {
          id: 'browser-exec',
          name: 'Browser Automation',
          description: 'Automate web browsing and scraping',
          capabilities: ['scrape', 'interact', 'screenshot']
        },
        {
          id: 'file-io',
          name: 'File System',
          description: 'Read/Write to workspace storage',
          capabilities: ['read', 'write', 'list']
        },
        {
          id: 'wokspec-api',
          name: 'WokSpec Integration',
          description: 'Direct access to Studio, Studio, Dilu',
          capabilities: ['generate-assets', 'deploy-site', 'brand-lookup']
        },
        {
          id: 'http-call',
          name: 'HTTP Client',
          description: 'Make external API requests',
          capabilities: ['get', 'post', 'put', 'delete']
        }
      ]
    },
    error: null
  });
});

export { tools as toolsRouter };
