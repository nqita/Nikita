/**
 * Nikita API client — safe for use in content scripts and background service worker.
 * Reads the Nikita/WokSpec accessToken from chrome.storage.session.
 */

export const ERAL_API = process.env.PLASMO_PUBLIC_ERAL_API_URL ?? "https://nikita.wokspec.org/api"

type IntegrationMetadataValue = string | number | boolean
type AIQuality = "fast" | "balanced" | "best"

interface ExtensionIntegrationContext {
  name: string
  kind: string
  url?: string
  origin?: string
  pageTitle?: string
  locale?: string
  instructions?: string
  capabilities?: string[]
  metadata?: Record<string, IntegrationMetadataValue>
}

interface RequestContextOptions {
  pageContext?: string
  pageUrl?: string
  pageTitle?: string
  context?: string
  focus?: string
  quality?: AIQuality
  systemHint?: string
  instructions?: string
  capabilities?: string[]
  metadata?: Record<string, IntegrationMetadataValue>
}

function normalizeText(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function deriveOrigin(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

function buildExtensionIntegration(
  options: RequestContextOptions,
  capabilities: string[]
): ExtensionIntegrationContext {
  return {
    name: "Nikita Web Extension",
    kind: "browser-extension",
    url: normalizeText(options.pageUrl),
    origin: deriveOrigin(options.pageUrl),
    pageTitle: normalizeText(options.pageTitle),
    locale: normalizeText(globalThis.navigator?.language),
    instructions: normalizeText(options.instructions),
    capabilities: [...new Set(capabilities)],
    metadata: options.metadata,
  }
}

export async function getAccessToken(): Promise<string | null> {
  const { accessToken } = await chrome.storage.session.get(["accessToken"])
  return accessToken ?? null
}

export interface EralChatResponse {
  message: string
  sessionId: string
}

export interface EralAnalyzeResponse {
  result: string
  type: AnalyzeType
}

export interface EralGenerateResponse {
  content: string
  type: GenerateType
}

export type AnalyzeType = "summarize" | "explain" | "review" | "extract" | "sentiment"
export type GenerateType = "improve" | "rewrite" | "expand" | "shorten"

export async function eralChat(
  message: string,
  sessionId: string,
  options: RequestContextOptions = {}
): Promise<EralChatResponse | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${ERAL_API}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Nikita-Source": "nikita-extension",
      },
      body: JSON.stringify({
        message,
        sessionId,
        quality: options.quality ?? "balanced",
        product: "extension",
        integration: buildExtensionIntegration(options, [
          "chat",
          "extension-chat",
          ...(options.pageContext ? ["page-context"] : []),
          ...(options.capabilities ?? []),
        ]),
        pageContext: options.pageContext,
      }),
    })
    if (!res.ok) return null

    const data = await res.json() as { data?: { response?: string; sessionId?: string } }
    return {
      message: data.data?.response ?? "",
      sessionId: data.data?.sessionId ?? sessionId,
    }
  } catch {
    return null
  }
}

export async function eralAnalyze(
  type: AnalyzeType,
  content: string,
  options: RequestContextOptions = {}
): Promise<EralAnalyzeResponse | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${ERAL_API}/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Nikita-Source": "nikita-extension",
      },
      body: JSON.stringify({
        type,
        content,
        quality: options.quality ?? "best",
        context: options.context,
        focus: options.focus,
        systemHint: options.systemHint,
        product: "extension",
        integration: buildExtensionIntegration(options, [
          "analyze",
          ...(options.capabilities ?? []),
        ]),
      }),
    })
    if (!res.ok) return null

    const data = await res.json() as { data?: { analysis?: string } }
    return {
      result: data.data?.analysis ?? "",
      type,
    }
  } catch {
    return null
  }
}

export async function eralGenerate(
  type: GenerateType,
  content: string,
  options: RequestContextOptions = {}
): Promise<EralGenerateResponse | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${ERAL_API}/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Nikita-Source": "nikita-extension",
      },
      body: JSON.stringify({
        type,
        content,
        quality: options.quality ?? "best",
        context: options.context,
        product: "extension",
        integration: buildExtensionIntegration(options, [
          "generate",
          ...(options.capabilities ?? []),
        ]),
      }),
    })
    if (!res.ok) return null

    const data = await res.json() as { data?: { content?: string } }
    return {
      content: data.data?.content ?? "",
      type,
    }
  } catch {
    return null
  }
}
