import { z } from 'zod';
import type { EralUser, IntegrationContext, IntegrationMetadataValue, KnownProduct } from '../types';

export const KNOWN_PRODUCTS = [
  'woksite',
  'studio',
  'wokhei',
  'api',
  'autiladus',
  'extension',
  'wokspec',
] as const;

export const ProductSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'Product names must be simple identifiers')
  .optional();

const IntegrationMetadataValueSchema = z.union([
  z.string().trim().min(1).max(500),
  z.number().finite(),
  z.boolean(),
]);

export const IntegrationSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    kind: z.string().trim().min(1).max(40).optional(),
    url: z.string().url().max(500).optional(),
    origin: z.string().url().max(200).optional(),
    pageTitle: z.string().trim().min(1).max(200).optional(),
    locale: z.string().trim().min(1).max(32).optional(),
    userRole: z.string().trim().min(1).max(80).optional(),
    instructions: z.string().trim().min(1).max(2000).optional(),
    capabilities: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    metadata: z.record(z.string().trim().min(1).max(60), IntegrationMetadataValueSchema).optional(),
  })
  .strict()
  .optional();

const PRODUCT_DESCRIPTIONS: Record<KnownProduct, string> = {
  woksite: 'WokSpec Site — Marketing and dashboard hub.',
  studio: 'Studio — Private design suite for pixel, vector, brand, UI/UX, voice, and tools.',
  wokhei: 'WokHei — Open-source news product and editorial feed.',
  api: 'WokAPI — Auth, sessions, billing, and routing.',
  autiladus: 'Autiladus — Automation harness built on OpenCode workflows.',
  extension: 'WokSpec Extension — Browser-level integration for internal workflows.',
  wokspec: 'WokSpec — The core ecosystem providing tools and services for builders.',
};

function isKnownProduct(product?: string | null): product is KnownProduct {
  return Boolean(product && (KNOWN_PRODUCTS as readonly string[]).includes(product));
}

function describeProduct(product: string): string {
  return isKnownProduct(product) ? PRODUCT_DESCRIPTIONS[product] : product;
}

function formatMetadataValue(value: IntegrationMetadataValue): string {
  return typeof value === 'string' ? value : String(value);
}

function describeIntegration(integration: IntegrationContext): string[] {
  const lines: string[] = [];
  if (integration.name) lines.push(`Integration name: ${integration.name}`);
  if (integration.kind) lines.push(`Integration kind: ${integration.kind}`);
  if (integration.url) lines.push(`Current URL: ${integration.url}`);
  if (integration.origin) lines.push(`Origin: ${integration.origin}`);
  if (integration.pageTitle) lines.push(`Page title: ${integration.pageTitle}`);
  if (integration.locale) lines.push(`Locale: ${integration.locale}`);
  if (integration.userRole) lines.push(`User role: ${integration.userRole}`);
  if (integration.capabilities?.length) {
    lines.push(`Integration capabilities: ${integration.capabilities.join(', ')}`);
  }
  if (integration.instructions) {
    lines.push(`Integration instructions: ${integration.instructions}`);
  }
  if (integration.metadata) {
    const entries = Object.entries(integration.metadata)
      .slice(0, 12)
      .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`);
    if (entries.length > 0) {
      lines.push(`Integration metadata:\n${entries.join('\n')}`);
    }
  }
  return lines;
}

/**
 * Build an enriched context string that gives Nikita knowledge about the
 * current user and any page/product context provided by the client.
 */
export function buildContext(options: {
  user: EralUser;
  pageContext?: string;
  product?: string;
  integration?: IntegrationContext;
}): string {
  const lines: string[] = [];
  const userSummary = options.user.email
    ? `${options.user.displayName} (${options.user.email})`
    : options.user.displayName;
  lines.push(`Current user: ${userSummary}`);

  if (options.product) {
    lines.push(`Product context: ${describeProduct(options.product)}`);
  }

  if (options.integration) {
    const integrationLines = describeIntegration(options.integration);
    if (integrationLines.length > 0) {
      lines.push('', 'Integration context:');
      lines.push(...integrationLines);
    }
  }

  if (options.pageContext) {
    lines.push(`\nPage content provided by user:\n${options.pageContext}`);
  }

  return lines.join('\n');
}

/** Product-specific system prompt extras by source product. */
export function productPromptExtras(
  product?: string,
  integration?: IntegrationContext
): string {
  const extras: string[] = [];

  switch (isKnownProduct(product) ? product : undefined) {
    case 'woksite':
      extras.push('You are helping on the WokSpec marketing site and client dashboard. Keep answers concise and point users to actions they can take on the site.');
      break;
    case 'studio':
      extras.push('When discussing asset generation, you can suggest pixel art styles, color palettes, and ComfyUI workflow tips.');
      break;
    case 'wokhei':
      extras.push('Focus on news, analysis, and editorial judgment. Provide concise summaries, highlights, and signals on credibility.');
      break;
    case 'api':
      extras.push('You are assisting with WokAPI. Explain auth/session flows, rate limits, and security expectations clearly and succinctly.');
      break;
    case 'autiladus':
      extras.push('Autiladus runs OpenCode-based automation. Offer step-by-step guidance, safety checks, and validation of targets before acting.');
      break;
    case 'extension':
      extras.push('You are running in the WokSpec browser extension. Help users understand and interact with the current web page.');
      break;
    case 'wokspec':
      extras.push('Provide general assistance across the entire WokSpec ecosystem, serving as a primary point of contact for help and support.');
      break;
    default:
      break;
  }

  if (integration?.kind) {
    extras.push(`You are embedded inside a ${integration.kind} integration. Respect that environment's constraints and help the user complete work there.`);
  }
  if (integration?.capabilities?.length) {
    extras.push(`Available integration capabilities: ${integration.capabilities.join(', ')}.`);
  }
  if (integration?.userRole) {
    extras.push(`Tailor your response to a user whose role is: ${integration.userRole}.`);
  }
  if (integration?.instructions) {
    extras.push(`Follow these integration-specific instructions: ${integration.instructions}`);
  }

  return extras.join('\n');
}
