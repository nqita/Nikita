import type { UserCredits } from '../types';

export const FREE_MESSAGES_LIMIT = 3;
export const FREE_BALANCE_START = 0.05;
export const MESSAGE_COST = 0.01;

export async function getUserCredits(
  kv: KVNamespace | undefined,
  userId: string
): Promise<UserCredits> {
  if (!kv) {
    return { balance: 0, messages: 0, plan: 'free', lastReset: new Date().toISOString() };
  }

  const stored = await kv.get(`credits:${userId}`);
  if (stored) {
    return JSON.parse(stored) as UserCredits;
  }

  // New user default
  const newCredits: UserCredits = {
    balance: FREE_BALANCE_START,
    messages: 0,
    plan: 'free',
    lastReset: new Date().toISOString()
  };
  await kv.put(`credits:${userId}`, JSON.stringify(newCredits));
  return newCredits;
}

export async function deductCredits(
  kv: KVNamespace | undefined,
  userId: string,
  cost: number = MESSAGE_COST
): Promise<{ ok: boolean; credits?: UserCredits; error?: string; status?: number }> {
  if (!kv) return { ok: true }; // Should not happen in prod

  const credits = await getUserCredits(kv, userId);

  if (credits.plan === 'free') {
    if (credits.messages >= FREE_MESSAGES_LIMIT) {
      return { ok: false, error: 'Free trial limit reached. Sign up to continue.', status: 401 };
    }
    credits.messages += 1;
  }

  if (credits.balance < cost && credits.plan !== 'enterprise') {
    return { ok: false, error: 'Insufficient credits. Please top up.', status: 402 };
  }

  credits.balance = Math.max(0, credits.balance - cost);
  await kv.put(`credits:${userId}`, JSON.stringify(credits));

  return { ok: true, credits };
}
