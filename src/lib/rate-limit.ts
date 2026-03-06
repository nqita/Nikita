interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default:  { limit: 100, windowSeconds: 60 },
  chat:     { limit: 30,  windowSeconds: 60 },
  generate: { limit: 20,  windowSeconds: 60 },
  analyze:  { limit: 30,  windowSeconds: 60 },
  wokgen:   { limit: 20,  windowSeconds: 60 },
  keys:     { limit: 10,  windowSeconds: 60 },
};

export async function checkRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  type: keyof typeof RATE_LIMITS = 'default'
): Promise<{ ok: boolean; remaining: number; resetIn: number }> {
  if (!kv) return { ok: true, remaining: -1, resetIn: 0 };

  const config = (RATE_LIMITS[type] ?? RATE_LIMITS['default'])!;
  const windowKey = `rl:${type}:${key}:${Math.floor(Date.now() / 1000 / config.windowSeconds)}`;

  try {
    const current = parseInt((await kv.get(windowKey)) ?? '0', 10);
    if (current >= config.limit) {
      return { ok: false, remaining: 0, resetIn: config.windowSeconds };
    }
    await kv.put(windowKey, String(current + 1), { expirationTtl: config.windowSeconds * 2 });
    return { ok: true, remaining: config.limit - current - 1, resetIn: config.windowSeconds };
  } catch {
    return { ok: true, remaining: -1, resetIn: 0 };
  }
}
