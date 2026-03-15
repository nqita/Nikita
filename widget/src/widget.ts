// ============================================================
// Nikita Widget — embeddable AI chat for any website
//
// Usage:
//   <script src="https://nikita.wokspec.org/widget.js"
//           data-nikita-key="eral_your_api_key"
//           data-nikita-name="Nikita"
//           data-nikita-color="#7c3aed"
//           data-nikita-position="bottom-right"
//           data-nikita-greeting="Hi! How can I help?"
//           data-nikita-product="support-portal"
//           data-nikita-quality="best"
//           data-nikita-page-context="true"
//   ></script>
//
// Or imperatively:
//   window.EralWidget.init({ apiKey: 'eral_...', name: 'Nikita' })
//   window.EralWidget.open()
//   window.EralWidget.close()
//   window.EralWidget.destroy()
//
// `window.Nikita` remains as a compatibility alias.
// ============================================================

const ERAL_API = 'https://nikita.wokspec.org/api';
const ROOT_ID = '__eral_host__';

type Position = 'bottom-right' | 'bottom-left';
type AIQuality = 'fast' | 'balanced' | 'best';
type IntegrationMetadataValue = string | number | boolean;

interface WidgetIntegrationConfig {
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

interface EralConfig {
  apiKey: string;
  name?: string;
  color?: string;
  position?: Position;
  quality?: AIQuality;
  greeting?: string;
  placeholder?: string;
  apiUrl?: string;
  product?: string;
  integration?: WidgetIntegrationConfig;
  capturePageContext?: boolean;
  pageContextMaxChars?: number;
}

interface ResolvedConfig {
  apiKey: string;
  name: string;
  color: string;
  position: Position;
  quality: AIQuality;
  greeting: string;
  placeholder: string;
  apiUrl: string;
  product?: string;
  integration?: WidgetIntegrationConfig;
  capturePageContext: boolean;
  pageContextMaxChars: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

function normalizeText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueStrings(values: Array<string | undefined>): string[] | undefined {
  const items = values.filter((value): value is string => Boolean(normalizeText(value)));
  return items.length > 0 ? [...new Set(items)] : undefined;
}

function parseBoolean(value?: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase());
}

function parsePositiveInt(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function buildStyles(): string {
  return `
    :host {
      all: initial;
      color-scheme: dark;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .nikita-shell {
      position: relative;
      font-family: inherit;
    }

    .nikita-btn {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: var(--nikita-accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(124, 58, 237, 0.3);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nikita-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(124, 58, 237, 0.45);
    }

    .nikita-btn svg {
      width: 24px;
      height: 24px;
      stroke: #fff;
    }

    .nikita-panel {
      width: 380px;
      height: min(600px, 80vh);
      margin-bottom: 16px;
      border-radius: 20px;
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nikita-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
    }

    .nikita-header {
      padding: 16px 20px;
      background: #141414;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nikita-header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nikita-avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--nikita-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      color: #fff;
      letter-spacing: 0.05em;
    }

    .nikita-name {
      font-weight: 600;
      font-size: 15px;
      color: #fff;
      letter-spacing: -0.01em;
    }

    .nikita-badge {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 2px;
      font-weight: 500;
    }

    .nikita-close {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      color: #888;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .nikita-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .nikita-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: radial-gradient(circle at top right, rgba(124, 58, 237, 0.03), transparent 40%);
    }

    .nikita-msg {
      display: flex;
      gap: 10px;
      max-width: 100%;
    }

    .nikita-user {
      justify-content: flex-end;
    }

    .nikita-assistant {
      justify-content: flex-start;
    }

    .nikita-bubble {
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.6;
      max-width: 85%;
      word-break: break-word;
    }

    .nikita-user .nikita-bubble {
      background: var(--nikita-accent);
      color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
    }

    .nikita-assistant .nikita-bubble {
      background: #1a1a1a;
      color: #f0f0f0;
      border-bottom-left-radius: 4px;
      border: 1px solid #2a2a2a;
    }

    .nikita-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 18px !important;
    }

    .nikita-typing span {
      width: 5px;
      height: 5px;
      background: #555;
      border-radius: 50%;
      animation: nikita-pulse 1.5s infinite;
    }

    @keyframes nikita-pulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    .nikita-input-row {
      padding: 16px 20px 20px;
      border-top: 1px solid #222;
      background: #111;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .nikita-input-container {
      position: relative;
      display: flex;
      align-items: flex-end;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 14px;
      padding: 2px;
      transition: border-color 0.2s ease;
    }

    .nikita-input-container:focus-within {
      border-color: rgba(124, 58, 237, 0.5);
    }

    .nikita-textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 14px;
      padding: 10px 14px;
      resize: none;
      min-height: 42px;
      max-height: 120px;
      outline: none;
      line-height: 1.5;
      font-family: inherit;
    }

    .nikita-send {
      width: 34px;
      height: 34px;
      margin: 4px;
      border-radius: 10px;
      background: var(--nikita-accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .nikita-send:hover:not(:disabled) {
      background: #8b5cf6;
      transform: scale(1.05);
    }

    .nikita-send:disabled {
      background: #333;
      opacity: 0.5;
      cursor: not-allowed;
    }

    .nikita-send svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: #fff;
      stroke-width: 2.5;
    }

    .nikita-powered {
      text-align: center;
      padding-bottom: 12px;
      font-size: 9px;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-weight: 600;
    }

    .nikita-powered a {
      color: inherit;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .nikita-powered a:hover {
      color: #666;
    }

    @media (max-width: 480px) {
      .nikita-panel {
        width: calc(100vw - 32px);
        height: min(560px, calc(100vh - 120px));
        margin-right: 0;
      }
    }
  `;
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function buildPageContext(maxChars: number): string | undefined {
  const parts: string[] = [];
  const title = normalizeText(document.title);
  const href = normalizeText(location.href);
  const description = normalizeText(
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content
      ?? document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content
  );
  const heading = normalizeText(document.querySelector('h1')?.textContent);
  const bodyText = normalizeText(document.body?.innerText)?.slice(0, maxChars);

  if (title) parts.push(`Page title: ${title}`);
  if (href) parts.push(`URL: ${href}`);
  if (description) parts.push(`Meta description: ${description}`);
  if (heading) parts.push(`Primary heading: ${heading}`);
  if (bodyText) parts.push(`Visible page text:\n${bodyText}`);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

class EralWidgetInstance {
  private config: ResolvedConfig;
  private host!: HTMLDivElement;
  private shadow!: ShadowRoot;
  private panel!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private textarea!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private messages: Message[] = [];
  private sessionId = crypto.randomUUID();
  private loading = false;
  private open = false;

  constructor(config: EralConfig) {
    this.config = {
      apiKey: config.apiKey,
      name: normalizeText(config.name) ?? 'Nikita Intelligence',
      color: normalizeText(config.color) ?? '#7c3aed',
      position: config.position ?? 'bottom-right',
      quality: config.quality ?? 'balanced',
      greeting: normalizeText(config.greeting) ?? "Hey — I'm Nikita. Ask me anything about WokSpec, the work, or what we can build together.",
      placeholder: normalizeText(config.placeholder) ?? 'Type your message...',
      apiUrl: normalizeText(config.apiUrl) ?? ERAL_API,
      product: normalizeText(config.product),
      integration: config.integration,
      capturePageContext: Boolean(config.capturePageContext),
      pageContextMaxChars: config.pageContextMaxChars ?? 4000,
    };
  }

  init(): void {
    if (document.getElementById(ROOT_ID)) return;

    this.host = document.createElement('div');
    this.host.id = ROOT_ID;
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647';
    this.host.style.setProperty('--nikita-accent', this.config.color);
    this.applyPosition();

    this.shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = buildStyles();
    this.shadow.appendChild(style);
    this.shadow.appendChild(this.buildDOM());

    document.body.appendChild(this.host);
    this.addGreeting();
  }

  private applyPosition(): void {
    this.host.style.bottom = '24px';
    this.host.style.left = this.config.position === 'bottom-left' ? '24px' : 'auto';
    this.host.style.right = this.config.position === 'bottom-right' ? '24px' : 'auto';
  }

  private buildDOM(): HTMLDivElement {
    const shell = createElement('div', 'nikita-shell');

    this.panel = createElement('div', 'nikita-panel nikita-hidden');

    const header = createElement('div', 'nikita-header');
    const headerTitle = createElement('div', 'nikita-header-title');

    const avatar = createElement('div', 'nikita-avatar');
    avatar.textContent = 'ER';

    const nameWrap = createElement('div', 'nikita-name-wrap');
    const name = createElement('div', 'nikita-name');
    name.textContent = this.config.name;
    const badge = createElement('div', 'nikita-badge');
    badge.textContent = 'WokSpec Ecosystem';

    nameWrap.append(name, badge);
    headerTitle.append(avatar, nameWrap);

    const closeButton = createElement('button', 'nikita-close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = '✕';

    header.append(headerTitle, closeButton);

    this.messagesEl = createElement('div', 'nikita-messages');

    const inputRow = createElement('div', 'nikita-input-row');
    const inputContainer = createElement('div', 'nikita-input-container');
    
    this.textarea = createElement('textarea', 'nikita-textarea');
    this.textarea.rows = 1;
    this.textarea.placeholder = this.config.placeholder;

    this.sendBtn = createElement('button', 'nikita-send');
    this.sendBtn.type = 'button';
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    inputContainer.append(this.textarea, this.sendBtn);
    inputRow.append(inputContainer);

    const powered = createElement('div', 'nikita-powered');
    powered.innerHTML = '<a href="https://wokspec.org" target="_blank" rel="noopener noreferrer">Powered by WokSpec</a>';

    this.panel.append(header, this.messagesEl, inputRow, powered);

    const toggleButton = createElement('button', 'nikita-btn');
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-label', 'Open Nikita AI');
    toggleButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 8v4"/><path d="M12 12h.01"/></svg>';

    shell.append(this.panel, toggleButton);

    toggleButton.addEventListener('click', () => this.toggle());
    closeButton.addEventListener('click', () => this.close());
    this.sendBtn.addEventListener('click', () => void this.send());
    this.textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void this.send();
      }
    });
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 120)}px`;
    });

    return shell;
  }

  private addGreeting(): void {
    this.pushMessage({ role: 'assistant', content: this.config.greeting, id: 'greeting' });
  }

  private getIntegrationContext(): WidgetIntegrationConfig | undefined {
    const integration = this.config.integration ?? {};
    const capabilities = uniqueStrings([
      ...(integration.capabilities ?? []),
      'chat',
      this.config.capturePageContext ? 'page-context' : undefined,
    ]);

    const resolved: WidgetIntegrationConfig = {
      id: normalizeText(integration.id),
      name: normalizeText(integration.name) ?? normalizeText(document.title) ?? location.hostname,
      kind: normalizeText(integration.kind) ?? 'website',
      url: normalizeText(integration.url) ?? location.href,
      origin: normalizeText(integration.origin) ?? location.origin,
      pageTitle: normalizeText(integration.pageTitle) ?? normalizeText(document.title),
      locale: normalizeText(integration.locale) ?? normalizeText(document.documentElement.lang),
      userRole: normalizeText(integration.userRole),
      instructions: normalizeText(integration.instructions),
      capabilities,
      metadata: integration.metadata,
    };

    return Object.values(resolved).some((value) => value !== undefined) ? resolved : undefined;
  }

  private pushMessage(message: Message): void {
    this.messages.push(message);
    const item = createElement('div', `nikita-msg nikita-${message.role}`);
    item.dataset.id = message.id;

    const bubble = createElement('div', 'nikita-bubble');
    bubble.textContent = message.content;
    item.appendChild(bubble);

    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private showTyping(): HTMLDivElement {
    const item = createElement('div', 'nikita-msg nikita-assistant');
    item.id = '__eral_typing__';

    const bubble = createElement('div', 'nikita-bubble');
    bubble.classList.add('nikita-typing');
    for (let index = 0; index < 3; index += 1) {
      bubble.appendChild(createElement('span'));
    }

    item.appendChild(bubble);
    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return item;
  }

  private buildRequestBody(message: string) {
    return {
      message,
      sessionId: this.sessionId,
      quality: this.config.quality,
      product: this.config.product,
      integration: this.getIntegrationContext(),
      pageContext: this.config.capturePageContext ? buildPageContext(this.config.pageContextMaxChars) : undefined,
    };
  }

  private async send(): Promise<void> {
    const text = this.textarea.value.trim();
    if (!text || this.loading) return;

    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.loading = true;
    this.sendBtn.disabled = true;

    this.pushMessage({ role: 'user', content: text, id: crypto.randomUUID() });
    const typing = this.showTyping();

    try {
      const response = await fetch(`${this.config.apiUrl}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Nikita-Source': 'widget',
        },
        body: JSON.stringify(this.buildRequestBody(text)),
      });

      typing.remove();

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
        this.pushMessage({
          role: 'assistant',
          content: payload.error?.message ?? 'Something went wrong.',
          id: crypto.randomUUID(),
        });
        return;
      }

      const payload = await response.json() as { data?: { response?: string } };
      this.pushMessage({
        role: 'assistant',
        content: payload.data?.response ?? 'I could not generate a response.',
        id: crypto.randomUUID(),
      });
    } catch {
      typing.remove();
      this.pushMessage({ role: 'assistant', content: 'Connection error. Please try again.', id: crypto.randomUUID() });
    } finally {
      this.loading = false;
      this.sendBtn.disabled = false;
      this.textarea.focus();
    }
  }

  toggle(): void {
    this.open ? this.close() : this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.panel.classList.remove('nikita-hidden');
    this.textarea.focus();
  }

  close(): void {
    this.open = false;
    this.panel.classList.add('nikita-hidden');
  }

  destroy(): void {
    this.host.remove();
  }
}

let instance: EralWidgetInstance | null = null;

const EralWidget = {
  init(config: EralConfig): void {
    if (instance) instance.destroy();
    instance = new EralWidgetInstance(config);
    instance.init();
  },
  open(): void {
    instance?.openPanel();
  },
  close(): void {
    instance?.close();
  },
  destroy(): void {
    instance?.destroy();
    instance = null;
  },
};

function autoInit(): void {
  const script = document.currentScript as HTMLScriptElement | null
    ?? document.querySelector<HTMLScriptElement>('script[data-nikita-key]');

  if (!script) return;

  const apiKey = normalizeText(script.dataset.eralKey);
  if (!apiKey) return;

  const integrationName = normalizeText(
    script.dataset.eralIntegrationName
      ?? script.dataset.eralApp
      ?? script.dataset.eralSite
  );

  const integration: WidgetIntegrationConfig | undefined = integrationName
    || normalizeText(script.dataset.eralKind)
    || normalizeText(script.dataset.eralInstructions)
    || normalizeText(script.dataset.eralUserRole)
    || normalizeText(script.dataset.eralLocale)
    ? {
        name: integrationName,
        kind: normalizeText(script.dataset.eralKind),
        locale: normalizeText(script.dataset.eralLocale),
        userRole: normalizeText(script.dataset.eralUserRole),
        instructions: normalizeText(script.dataset.eralInstructions),
      }
    : undefined;

  EralWidget.init({
    apiKey,
    name: normalizeText(script.dataset.eralName),
    color: normalizeText(script.dataset.eralColor),
    position: normalizeText(script.dataset.eralPosition) === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    greeting: normalizeText(script.dataset.eralGreeting),
    placeholder: normalizeText(script.dataset.eralPlaceholder),
    apiUrl: normalizeText(script.dataset.eralApiUrl),
    product: normalizeText(script.dataset.eralProduct),
    quality: normalizeText(script.dataset.eralQuality) as AIQuality | undefined,
    integration,
    capturePageContext: parseBoolean(script.dataset.eralPageContext),
    pageContextMaxChars: parsePositiveInt(script.dataset.eralPageContextMaxChars),
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

declare global {
  interface Window {
    EralWidget: typeof EralWidget;
    Nikita: typeof EralWidget;
  }
}

window.EralWidget = EralWidget;
window.Nikita = EralWidget;

export {};
