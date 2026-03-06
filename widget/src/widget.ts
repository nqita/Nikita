// ============================================================
// Eral Widget — embeddable AI chat for any website
//
// Usage:
//   <script src="https://eral.wokspec.org/widget.js"
//           data-eral-key="eral_your_api_key"
//           data-eral-name="Eral"
//           data-eral-color="#7c3aed"
//           data-eral-position="bottom-right"
//           data-eral-greeting="Hi! How can I help?"
//           data-eral-product="support-portal"
//           data-eral-page-context="true"
//   ></script>
//
// Or imperatively:
//   window.EralWidget.init({ apiKey: 'eral_...', name: 'Eral' })
//   window.EralWidget.open()
//   window.EralWidget.close()
//   window.EralWidget.destroy()
//
// `window.Eral` remains as a compatibility alias.
// ============================================================

const ERAL_API = 'https://eral.wokspec.org/api';
const ROOT_ID = '__eral_host__';

type Position = 'bottom-right' | 'bottom-left';
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .eral-shell {
      position: relative;
      font-family: inherit;
    }

    .eral-btn {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      background: var(--eral-accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.28);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .eral-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.38);
    }

    .eral-panel {
      width: 360px;
      height: min(520px, 70vh);
      margin-bottom: 12px;
      border-radius: 16px;
      background: #111;
      border: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 48px rgba(0, 0, 0, 0.48);
      overflow: hidden;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .eral-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px) scale(0.97);
    }

    .eral-header {
      padding: 14px 16px;
      background: #141414;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .eral-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .eral-avatar {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      background: var(--eral-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
    }

    .eral-name-wrap {
      min-width: 0;
    }

    .eral-name {
      font-weight: 600;
      font-size: 14px;
      color: #f5f5f5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .eral-badge {
      font-size: 10px;
      color: #888;
      margin-top: 1px;
    }

    .eral-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      font-size: 18px;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s ease;
      line-height: 1;
      flex-shrink: 0;
    }

    .eral-close:hover {
      color: #f5f5f5;
    }

    .eral-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .eral-messages::-webkit-scrollbar {
      width: 4px;
    }

    .eral-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .eral-messages::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 999px;
    }

    .eral-msg {
      display: flex;
      gap: 8px;
      max-width: 100%;
    }

    .eral-user {
      justify-content: flex-end;
    }

    .eral-assistant {
      justify-content: flex-start;
    }

    .eral-bubble {
      padding: 10px 13px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.5;
      max-width: 82%;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .eral-user .eral-bubble {
      background: var(--eral-accent);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .eral-assistant .eral-bubble {
      background: #1e1e1e;
      color: #e8e8e8;
      border-bottom-left-radius: 4px;
      border: 1px solid #2a2a2a;
    }

    .eral-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .eral-typing span {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #666;
      border-radius: 999px;
      animation: eral-bounce 1.2s infinite;
    }

    .eral-typing span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .eral-typing span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes eral-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    .eral-input-row {
      padding: 12px 14px;
      border-top: 1px solid #222;
      background: #141414;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .eral-textarea {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      color: #f0f0f0;
      font-size: 13.5px;
      padding: 9px 12px;
      resize: none;
      min-height: 40px;
      max-height: 100px;
      outline: none;
      transition: border-color 0.15s ease;
      line-height: 1.4;
      font-family: inherit;
    }

    .eral-textarea:focus {
      border-color: var(--eral-accent);
    }

    .eral-textarea::placeholder {
      color: #555;
    }

    .eral-send {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 8px;
      background: var(--eral-accent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s ease;
    }

    .eral-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .eral-send svg {
      width: 16px;
      height: 16px;
      fill: #fff;
    }

    .eral-powered {
      text-align: center;
      padding: 6px;
      font-size: 10px;
      color: #444;
    }

    .eral-powered a {
      color: #555;
      text-decoration: none;
    }

    .eral-powered a:hover {
      color: #888;
    }

    @media (max-width: 480px) {
      .eral-panel {
        width: min(360px, calc(100vw - 20px));
        border-radius: 12px;
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
      name: normalizeText(config.name) ?? 'Eral',
      color: normalizeText(config.color) ?? '#7c3aed',
      position: config.position ?? 'bottom-right',
      greeting: normalizeText(config.greeting) ?? 'Hi! I\'m Eral, your AI assistant. How can I help?',
      placeholder: normalizeText(config.placeholder) ?? 'Ask me anything...',
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
    this.host.style.setProperty('--eral-accent', this.config.color);
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
    this.host.style.bottom = '20px';
    this.host.style.left = this.config.position === 'bottom-left' ? '20px' : 'auto';
    this.host.style.right = this.config.position === 'bottom-right' ? '20px' : 'auto';
  }

  private buildDOM(): HTMLDivElement {
    const shell = createElement('div', 'eral-shell');

    this.panel = createElement('div', 'eral-panel eral-hidden');

    const header = createElement('div', 'eral-header');
    const headerTitle = createElement('div', 'eral-header-title');

    const avatar = createElement('div', 'eral-avatar');
    avatar.textContent = this.config.name.charAt(0).toUpperCase();

    const nameWrap = createElement('div', 'eral-name-wrap');
    const name = createElement('div', 'eral-name');
    name.textContent = this.config.name;
    const badge = createElement('div', 'eral-badge');
    badge.textContent = 'AI · WokSpec';

    nameWrap.append(name, badge);
    headerTitle.append(avatar, nameWrap);

    const closeButton = createElement('button', 'eral-close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = '✕';

    header.append(headerTitle, closeButton);

    this.messagesEl = createElement('div', 'eral-messages');

    const inputRow = createElement('div', 'eral-input-row');
    this.textarea = createElement('textarea', 'eral-textarea');
    this.textarea.rows = 1;
    this.textarea.placeholder = this.config.placeholder;

    this.sendBtn = createElement('button', 'eral-send');
    this.sendBtn.type = 'button';
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.sendBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"></path></svg>';

    inputRow.append(this.textarea, this.sendBtn);

    const powered = createElement('div', 'eral-powered');
    powered.innerHTML = '<a href="https://eral.wokspec.org" target="_blank" rel="noopener noreferrer">Powered by Eral</a>';

    this.panel.append(header, this.messagesEl, inputRow, powered);

    const toggleButton = createElement('button', 'eral-btn');
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-label', 'Open Eral AI');
    toggleButton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

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
      this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 100)}px`;
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
    const item = createElement('div', `eral-msg eral-${message.role}`);
    item.dataset.id = message.id;

    const bubble = createElement('div', 'eral-bubble');
    bubble.textContent = message.content;
    item.appendChild(bubble);

    this.messagesEl.appendChild(item);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private showTyping(): HTMLDivElement {
    const item = createElement('div', 'eral-msg eral-assistant');
    item.id = '__eral_typing__';

    const bubble = createElement('div', 'eral-bubble');
    bubble.classList.add('eral-typing');
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
          'X-Eral-Source': 'widget',
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
    this.panel.classList.remove('eral-hidden');
    this.textarea.focus();
  }

  close(): void {
    this.open = false;
    this.panel.classList.add('eral-hidden');
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
    ?? document.querySelector<HTMLScriptElement>('script[data-eral-key]');

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
    Eral: typeof EralWidget;
  }
}

window.EralWidget = EralWidget;
window.Eral = EralWidget;

export {};
