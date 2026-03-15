import type { ApiKeyRecord, ApiKeyScope } from '../types';

const KEY_PREFIX = 'eral_';
const KV_PREFIX = 'apikey:';
const OWNER_INDEX_PREFIX = 'apikeys_owner:';

/** Generate a new API key string. Format: eral_<random32hex> */
function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash the raw key for storage (never store plaintext). */
async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The key ID is the first 16 chars after the prefix (safe to expose). */
function keyId(raw: string): string {
  return raw.slice(KEY_PREFIX.length, KEY_PREFIX.length + 16);
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createApiKey(
  kv: KVNamespace,
  ownerId: string,
  name: string,
  scopes: ApiKeyScope[] = ['*']
): Promise<{ key: string; record: ApiKeyRecord }> {
  const raw = generateRawKey();
  const hash = await hashKey(raw);
  const id = keyId(raw);

  const record: ApiKeyRecord = {
    id,
    name,
    ownerId,
    scopes,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  // Store hash → record (used for lookup on each request)
  await kv.put(`${KV_PREFIX}${hash}`, JSON.stringify(record));

  // Store owner index for listing (id → hash mapping)
  const ownerKey = `${OWNER_INDEX_PREFIX}${ownerId}`;
  const existing = await kv.get(ownerKey);
  const index: Record<string, string> = existing ? JSON.parse(existing) : {};
  index[id] = hash;
  await kv.put(ownerKey, JSON.stringify(index));

  return { key: raw, record };
}

// ── Verify ────────────────────────────────────────────────────────────────────

/**
 * Verify an API key and return its record.
 * Also updates lastUsedAt (fire-and-forget).
 */
export async function verifyApiKey(
  kv: KVNamespace | undefined,
  raw: string
): Promise<ApiKeyRecord | null> {
  if (!kv) return null;
  if (!raw.startsWith(KEY_PREFIX)) return null;

  try {
    const hash = await hashKey(raw);
    const stored = await kv.get(`${KV_PREFIX}${hash}`);
    if (!stored) return null;

    const record = JSON.parse(stored) as ApiKeyRecord;

    // Fire-and-forget lastUsedAt update
    const updated = { ...record, lastUsedAt: new Date().toISOString() };
    kv.put(`${KV_PREFIX}${hash}`, JSON.stringify(updated)).catch(() => {});

    return record;
  } catch {
    return null;
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listApiKeys(
  kv: KVNamespace | undefined,
  ownerId: string
): Promise<ApiKeyRecord[]> {
  if (!kv) return [];
  try {
    const ownerKey = `${OWNER_INDEX_PREFIX}${ownerId}`;
    const raw = await kv.get(ownerKey);
    if (!raw) return [];
    const index: Record<string, string> = JSON.parse(raw);

    const records = await Promise.all(
      Object.values(index).map(async (hash) => {
        const stored = await kv.get(`${KV_PREFIX}${hash}`);
        return stored ? (JSON.parse(stored) as ApiKeyRecord) : null;
      })
    );

    return records.filter((r): r is ApiKeyRecord => r !== null);
  } catch {
    return [];
  }
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeApiKey(
  kv: KVNamespace | undefined,
  ownerId: string,
  keyId: string
): Promise<boolean> {
  if (!kv) return false;
  try {
    const ownerKey = `${OWNER_INDEX_PREFIX}${ownerId}`;
    const raw = await kv.get(ownerKey);
    if (!raw) return false;

    const index: Record<string, string> = JSON.parse(raw);
    const hash = index[keyId];
    if (!hash) return false;

    await kv.delete(`${KV_PREFIX}${hash}`);
    delete index[keyId];
    await kv.put(ownerKey, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}
