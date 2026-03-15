// ============================================================
// Nikita — WokSpec AI
// Cloudflare Worker bindings & shared type definitions
// ============================================================

export interface Env {
  // KV Namespaces
  KV_SESSIONS: KVNamespace;
  KV_RATE_LIMITS: KVNamespace | undefined;
  KV_MEMORY: KVNamespace | undefined;
  KV_API_KEYS: KVNamespace | undefined; // API keys for external site integration
  KV_CREDITS: KVNamespace | undefined;  // Enterprise credit system

  // Cloudflare Workers AI (fallback when OpenAI key absent)
  AI: Ai | undefined;

  // Secrets
  JWT_SECRET: string;
  OPENAI_API_KEY: string | undefined;
  GROQ_API_KEY: string | undefined;
  SENTRY_DSN: string | undefined;
  AI_PROVIDER: 'cloudflare' | 'openai' | 'groq' | undefined;
  AI_SPEND_MODE: AISpendMode | undefined;
  OPENAI_MODEL: string | undefined;
  OPENAI_CHAT_MODEL: string | undefined;
  OPENAI_GENERATE_MODEL: string | undefined;
  OPENAI_ANALYZE_MODEL: string | undefined;
  OPENAI_STUDIO_MODEL: string | undefined;
  GROQ_MODEL: string | undefined;
  CF_AI_MODEL: string | undefined;
  CF_AI_CHAT_MODEL: string | undefined;
  CF_AI_GENERATE_MODEL: string | undefined;
  CF_AI_ANALYZE_MODEL: string | undefined;
  CF_AI_STUDIO_MODEL: string | undefined;
  CF_AI_FALLBACK_MODEL: string | undefined;

  ENVIRONMENT: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface EralUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  plan?: 'free' | 'premium' | 'enterprise';
}

/** Auth context — populated by either JWT or API key */
export interface EralAuth {
  user: EralUser | null;
  /** API key record when authenticated via key (external sites / bots) */
  apiKey: ApiKeyRecord | null;
  /** How this request was authenticated */
  method: 'jwt' | 'apikey' | 'none';
}

export interface UserCredits {
  balance: number;      // USD balance (e.g. 0.05)
  messages: number;     // Message count for free tier
  plan: 'free' | 'premium' | 'enterprise';
  lastReset: string;    // ISO timestamp
}

export interface ApiKeyRecord {
  id: string;           // key id (prefix of the key, safe to store)
  name: string;         // human label e.g. "My Site" or "Discord Bot"
  ownerId: string;      // WokSpec user id who created it
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
}

export type ApiKeyScope = 'chat' | 'generate' | 'analyze' | 'studio' | '*';

export type KnownProduct =
  | 'woksite'
  | 'studio'
  | 'wokhei'
  | 'api'
  | 'autiladus'
  | 'extension'
  ;

export type IntegrationMetadataValue = string | number | boolean;

export interface IntegrationContext {
  id?: string;
  name?: string;
  kind?: string;
  url?: string;
  origin?: string;
  pageTitle?: string;
  locale?: string;
  userRole?: string;
  instructions?: string;
  capabilities?: string[];
  metadata?: Record<string, IntegrationMetadataValue>;
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
  error: null;
}

export interface ApiErrorResponse {
  data: null;
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── AI ────────────────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export type GenerateType =
  | 'post'
  | 'caption'
  | 'code'
  | 'prompt'
  | 'docs'
  | 'email'
  | 'summary'
  | 'rewrite'
  | 'expand'
  | 'shorten'
  | 'improve';

export type AnalyzeType =
  | 'summarize'
  | 'explain'
  | 'review'
  | 'extract'
  | 'sentiment';

export type AIRoute = 'chat' | 'generate' | 'analyze' | 'studio';

export type AIQuality = 'fast' | 'balanced' | 'best';

export type AISpendMode = 'free-only' | 'paid-fallback' | 'paid-primary';

export interface ModelInfo {
  provider: 'openai' | 'cloudflare' | 'groq';
  model: string;
  fallback: boolean;
}
