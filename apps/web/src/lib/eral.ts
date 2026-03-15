const ERAL_API = process.env.NEXT_PUBLIC_ERAL_API_URL ?? 'https://nikita.wokspec.org/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  data: {
    response: string;
    sessionId: string;
    model: { provider: string; model: string };
  };
  error: null | { code: string; message: string; status: number };
}

export interface UserCredits {
  balance: number;
  messages: number;
  plan: 'free' | 'premium' | 'enterprise';
  lastReset: string;
}

export interface CreditsResponse {
  data: UserCredits;
  error: null | { code: string; message: string; status: number };
}

export interface SessionsResponse {
  data: { sessions: string[] };
  error: null | string;
}

export interface SessionResponse {
  data: { sessionId: string; messages: ChatMessage[] };
  error: null | string;
}

function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eral_token') ?? '';
}

function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('eral_anon_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('eral_anon_id', id);
  }
  return id;
}

function buildHeaders(): HeadersInit {
  const key = getApiKey();
  const anonId = getAnonId();
  const h: Record<string, string> = { 
    'Content-Type': 'application/json',
    'X-Nikita-Anon-Id': anonId
  };
  if (key) {
    h['Authorization'] = `Bearer ${key}`;
  }
  return h;
}

function fetchOptions(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: buildHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
}

export async function sendChat(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${ERAL_API}/v1/chat`, fetchOptions('POST', { message, sessionId }));
  const payload = await res.json();
  if (!res.ok) {
    return { data: null as any, error: payload.error || { code: 'ERROR', message: 'Chat failed', status: res.status } };
  }
  return payload as ChatResponse;
}

export async function getCredits(): Promise<CreditsResponse> {
  const res = await fetch(`${ERAL_API}/v1/credits`, fetchOptions('GET'));
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    return { data: null as any, error: payload.error || { code: 'ERROR', message: 'Failed to fetch credits', status: res.status } };
  }
  return res.json() as Promise<CreditsResponse>;
}

export async function getSessions(): Promise<SessionsResponse> {
  const res = await fetch(`${ERAL_API}/v1/chat/sessions`, fetchOptions('GET'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SessionsResponse>;
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${ERAL_API}/v1/chat/${encodeURIComponent(sessionId)}`, fetchOptions('GET'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SessionResponse>;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${ERAL_API}/v1/chat/${encodeURIComponent(sessionId)}`, fetchOptions('DELETE'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function createApiKey(name?: string): Promise<{ data: { key: string; id: string }; error: null | string }> {
  const res = await fetch(`${ERAL_API}/v1/keys`, fetchOptions('POST', { name: name ?? 'My App' }));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function listApiKeys(): Promise<{ data: { keys: { id: string; name: string; createdAt: string }[] }; error: null | string }> {
  const res = await fetch(`${ERAL_API}/v1/keys`, fetchOptions('GET'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetch(`${ERAL_API}/v1/keys/${encodeURIComponent(id)}`, fetchOptions('DELETE'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getStatus(): Promise<unknown> {
  const res = await fetch(`${ERAL_API}/v1/status`, fetchOptions('GET'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
