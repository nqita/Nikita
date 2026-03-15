/**
 * nikita-compose.tsx
 * Injects a small "Write with Nikita" button inside focused textareas / contenteditable elements.
 * Clicking it opens an inline panel where Nikita can generate or improve the text.
 */
import cssText from 'data-text:./nikita-compose.css';
import type { PlasmoCSConfig } from 'plasmo';
import { useEffect, useRef, useState } from 'react';
import { eralGenerate, getAccessToken } from '../lib/nikita';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  all_frames: false,
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText + `
    @keyframes nikita-pulse {
      0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(124, 58, 237, 0); }
      100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
    }
  `;
  return style;
};

// ---------- helpers ----------------------------------------------------------

function isEditableTarget(el: Element | null): el is HTMLTextAreaElement | HTMLInputElement | HTMLElement {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    return !type || ['text', 'search', 'email', 'url'].includes(type);
  }
  return (el as HTMLElement).isContentEditable === true;
}

function getContent(el: HTMLElement): string {
  if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
    return (el as HTMLInputElement).value;
  }
  return el.innerText ?? el.textContent ?? '';
}

function setContent(el: HTMLElement, text: string) {
  if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      ?? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    native?.set?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    el.innerText = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ---------- main component ---------------------------------------------------

function ComposeButton() {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeEl, setActiveEl] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<'generate' | 'improve'>('generate');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Element;
      if (!isEditableTarget(el)) return;
      const rect = (el as HTMLElement).getBoundingClientRect();
      setActiveEl(el as HTMLElement);
      setAnchor({
        x: window.scrollX + rect.right - 38,
        y: window.scrollY + rect.bottom - 34,
      });
      setPanelOpen(false);
      setResult('');
      setPrompt('');
    };
    const onBlur = (e: FocusEvent) => {
      // Don't hide if focus moved to our button/panel
      setTimeout(() => {
        if (btnRef.current && document.activeElement &&
          (btnRef.current.contains(document.activeElement) ||
           document.activeElement.closest?.('[data-nikita-compose]'))) return;
        if (!document.activeElement || !isEditableTarget(document.activeElement)) {
          setAnchor(null);
          setPanelOpen(false);
        }
      }, 150);
    };
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);
    return () => {
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);
    };
  }, []);

  async function run() {
    if (!activeEl) return;
    setLoading(true);
    setResult('');
    try {
      const existing = getContent(activeEl);
      const type = mode === 'improve' && existing ? 'improve' : 'expand';
      const content = mode === 'improve' && existing
        ? existing
        : prompt || 'Write something helpful.';
      const res = await eralGenerate(type, content, {
        pageUrl: location.href,
        pageTitle: document.title,
        context: mode === 'generate' && existing
          ? `Adapt the result so it fits naturally with this existing field context:\n${existing}`
          : undefined,
        capabilities: ['compose-assist'],
      });
      setResult(res?.content ?? '');
    } catch {
      setResult('Failed to reach Nikita. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function applyResult() {
    if (!activeEl || !result) return;
    setContent(activeEl, result);
    setPanelOpen(false);
    setResult('');
    activeEl.focus();
  }

  if (!anchor) return null;

  return (
    <>
      {/* Small floating button anchored to the input */}
      <button
        ref={btnRef}
        data-nikita-compose
        onClick={() => {
          setMode(getContent(activeEl!) ? 'improve' : 'generate');
          setPanelOpen(p => !p);
        }}
        title="Write with Nikita"
        style={{
          position: 'absolute',
          left: anchor.x,
          top: anchor.y,
          zIndex: 2147483640,
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.95,
          boxShadow: '0 4px 12px rgba(124,58,237,0.5)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'nikita-pulse 2s infinite',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.15) rotate(-3deg)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(124,58,237,0.6)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.5)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>
        </svg>
      </button>

      {/* Compose panel */}
      {panelOpen && (
        <div
          data-nikita-compose
          style={{
            position: 'absolute',
            left: Math.max(8, anchor.x - 272),
            top: anchor.y + 36,
            zIndex: 2147483639,
            width: 300,
            background: '#0f0f0f',
            border: '1px solid #333',
            borderRadius: 14,
            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.2)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Supercharged
            </span>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6, padding: 2, background: '#1a1a1a', borderRadius: 8 }}>
            {(['generate', 'improve'] as const).map(m => (
              <button
                key={m}
                data-nikita-compose
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: mode === m ? '#2d2d2d' : 'transparent',
                  color: mode === m ? '#fff' : '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: mode === m ? 600 : 500,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {m === 'generate' ? 'Generate' : 'Improve'}
              </button>
            ))}
          </div>

          {mode === 'generate' && (
            <textarea
              data-nikita-compose
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what to write…"
              rows={2}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                padding: '8px 10px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
            />
          )}

          {mode === 'improve' && (
            <div style={{ color: '#888', fontSize: 12, padding: '2px 0' }}>
              Nikita will improve the current text in the field.
            </div>
          )}

          <button
            data-nikita-compose
            onClick={run}
            disabled={loading}
            style={{
              background: '#7c3aed',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Writing…' : 'Write with Nikita'}
          </button>

          {result && (
            <>
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #252525',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 12.5,
                padding: '8px 10px',
                maxHeight: 120,
                overflowY: 'auto',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {result}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  data-nikita-compose
                  onClick={applyResult}
                  style={{
                    flex: 1,
                    background: '#7c3aed',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '7px',
                    cursor: 'pointer',
                  }}
                >
                  Use this
                </button>
                <button
                  data-nikita-compose
                  onClick={() => setResult('')}
                  style={{
                    flex: 1,
                    background: '#1e1e1e',
                    border: '1px solid #2a2a2a',
                    borderRadius: 8,
                    color: '#888',
                    fontSize: 12,
                    padding: '7px',
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ComposeButton;
