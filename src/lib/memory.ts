import type { Message } from '../types';

const MAX_MESSAGES = 40;       // Max messages stored per session
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function memoryKey(userId: string, sessionId: string): string {
  return `mem:${userId}:${sessionId}`;
}

/** Retrieve conversation history for a user session. */
export async function getMemory(
  kv: KVNamespace | undefined,
  userId: string,
  sessionId: string
): Promise<Message[]> {
  if (!kv) return [];
  try {
    const raw = await kv.get(memoryKey(userId, sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

/** Append new messages to a user session's memory. */
export async function appendMemory(
  kv: KVNamespace | undefined,
  userId: string,
  sessionId: string,
  newMessages: Message[]
): Promise<void> {
  if (!kv) return;
  try {
    const existing = await getMemory(kv, userId, sessionId);
    const updated = [...existing, ...newMessages].slice(-MAX_MESSAGES);
    await kv.put(memoryKey(userId, sessionId), JSON.stringify(updated), {
      expirationTtl: TTL_SECONDS,
    });
  } catch {
    // Non-fatal — memory is a quality-of-life feature, not required
  }
}

/** Clear a user session's memory. */
export async function clearMemory(
  kv: KVNamespace | undefined,
  userId: string,
  sessionId: string
): Promise<void> {
  if (!kv) return;
  try {
    await kv.delete(memoryKey(userId, sessionId));
  } catch { /* non-fatal */ }
}

/** List all session IDs for a user (uses KV list with prefix). */
export async function listSessions(
  kv: KVNamespace | undefined,
  userId: string
): Promise<string[]> {
  if (!kv) return [];
  try {
    const list = await kv.list({ prefix: `mem:${userId}:` });
    return list.keys.map((k) => k.name.replace(`mem:${userId}:`, ''));
  } catch {
    return [];
  }
}
