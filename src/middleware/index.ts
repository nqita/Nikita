import type { MiddlewareHandler, Context } from 'hono';
import type { Env, EralUser, EralAuth, ApiKeyScope } from '../types';
import { verifyToken } from '../lib/jwt';
import { verifyApiKey } from '../lib/api-keys';
import { checkRateLimit } from '../lib/rate-limit';

export const securityHeaders = (): MiddlewareHandler<{ Bindings: Env }> => {
  return async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    if (c.env.ENVIRONMENT === 'production') {
      c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
  };
};

export const requestId = (): MiddlewareHandler => {
  return async (c, next) => {
    const id = c.req.header('cf-ray') ?? crypto.randomUUID();
    c.set('requestId' as never, id);
    await next();
    c.header('X-Request-ID', id);
  };
};

export const rateLimit = (
  type: 'default' | 'chat' | 'generate' | 'analyze' | 'studio' | 'keys' = 'default'
): MiddlewareHandler<{ Bindings: Env }> => {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';
    const result = await checkRateLimit(c.env.KV_RATE_LIMITS, ip, type);
    if (!result.ok) {
      c.header('Retry-After', String(result.resetIn));
      return c.json(
        { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 } },
        429
      );
    }
    c.header('X-RateLimit-Remaining', String(result.remaining));
    await next();
  };
};

async function resolveAuth(c: Context<{ Bindings: Env; Variables: any }>): Promise<EralAuth> {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // Check for anonymous session cookie for free trial
    const anonId = c.req.header('X-Nikita-Anon-Id');
    if (anonId) {
      const user: EralUser = { id: `anon:${anonId}`, email: '', displayName: 'Trial User', avatarUrl: null, plan: 'free' };
      return { user, apiKey: null, method: 'none' };
    }
    return { user: null, apiKey: null, method: 'none' };
  }

  // API key (starts with eral_)
  if (token.startsWith('eral_')) {
    const record = await verifyApiKey(c.env.KV_API_KEYS, token);
    if (record) {
      const user: EralUser = { id: record.ownerId, email: '', displayName: `API Key: ${record.name}`, avatarUrl: null };
      return { user, apiKey: record, method: 'apikey' };
    }
    return { user: null, apiKey: null, method: 'none' };
  }

  // WokSpec JWT
  if (!c.env.JWT_SECRET) {
    return { user: null, apiKey: null, method: 'none' };
  }

  const user = await verifyToken(token, c.env.JWT_SECRET);
  if (user) {
    return { user, apiKey: null, method: 'jwt' };
  }

  return { user: null, apiKey: null, method: 'none' };
}

export const requireAuth = (
  scope?: ApiKeyScope
): MiddlewareHandler<{ Bindings: Env; Variables: { user: EralUser; auth: EralAuth } }> => {
  return async (c, next) => {
    const auth = await resolveAuth(c);
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
    const method = c.req.method;
    const url = c.req.url;

    if (!auth.user) {
      console.warn(`[Auth-Failed] 401 Unauthorized - IP: ${ip} - Method: ${method} - URL: ${url}`);
      return c.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Provide a WokSpec JWT or Nikita API key (Authorization: Bearer <token>)', status: 401 } },
        401
      );
    }
    if (auth.method === 'apikey' && scope && auth.apiKey) {
      const allowed = auth.apiKey.scopes.includes('*') || auth.apiKey.scopes.includes(scope);
      if (!allowed) {
        console.warn(`[Auth-Failed] 403 Forbidden - Scope ${scope} missing - IP: ${ip} - User: ${auth.user.id}`);
        return c.json(
          { data: null, error: { code: 'FORBIDDEN', message: `API key missing scope: ${scope}`, status: 403 } },
          403
        );
      }
    }
    c.set('user', auth.user);
    c.set('auth', auth);
    await next();
  };
};

export const optionalAuth = (): MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: EralUser | null; auth: EralAuth };
}> => {
  return async (c, next) => {
    const auth = await resolveAuth(c);
    c.set('user', auth.user);
    c.set('auth', auth);
    await next();
  };
};
