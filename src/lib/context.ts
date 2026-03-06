import { z } from 'zod';
import type { EralUser, IntegrationContext, IntegrationMetadataValue, KnownProduct } from '../types';

export const KNOWN_PRODUCTS = [
  'woksite',
  'wokgen',
  'wokpost',
  'chopsticks',
  'extension',
  'dilu',
  'vecto',
  'woktool',
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
  woksite: 'WokSite — the WokSpec main hub (bookings, SSO, community)',
  wokgen: 'WokGen — AI pixel art and asset generation tool',
  wokpost: 'WokPost — workflow-focused social media for builders',
  chopsticks: 'Chopsticks — the WokSpec Discord bot dashboard',
  extension: 'WokSpec browser extension',
  dilu: 'Dilu — the WokSpec launchpad for shipping production-ready templates',
  vecto: 'Vecto — the WokSpec AI design and brand studio',
  woktool: 'WokTool — the WokSpec browser tools and productivity suite',
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
 * Build an enriched context string that gives Eral knowledge about the
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
    case 'wokgen':
      extras.push('When discussing asset generation, you can suggest pixel art styles, color palettes, and ComfyUI workflow tips.');
      break;
    case 'wokpost':
      extras.push('When helping with posts, optimize for developer and builder audiences. Suggest relevant hashtags and formatting.');
      break;
    case 'chopsticks':
      extras.push('You have knowledge of Discord bot commands, economy systems, and community management within WokSpec.');
      break;
    case 'extension':
      extras.push('You are running in the WokSpec browser extension. Help users understand and interact with the current web page.');
      break;
    case 'dilu':
      extras.push('Help users choose templates, understand launch workflows, and connect Dilu to the wider WokSpec stack.');
      break;
    case 'vecto':
      extras.push('When helping in Vecto, focus on brand systems, visual direction, asset generation workflows, and creative execution.');
      break;
    case 'woktool':
      extras.push('When helping in WokTool, guide users to the right browser-based utilities and keep answers practical and fast.');
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
