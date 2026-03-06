/**
 * eral-compose.tsx
 * Injects a small "Write with Eral" button inside focused textareas / contenteditable elements.
 * Clicking it opens an inline panel where Eral can generate or improve the text.
 */
import cssText from 'data-text:./eral-compose.css';
import type { PlasmoCSConfig } from 'plasmo';
import { useEffect, useRef, useState } from 'react';
import { eralGenerate, getAccessToken } from '../lib/eral';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  all_frames: false,
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
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
           document.activeElement.closest?.('[data-eral-compose]'))) return;
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
      setResult('Failed to reach Eral. Check your connection.');
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
        data-eral-compose
        onClick={() => {
          setMode(getContent(activeEl!) ? 'improve' : 'generate');
          setPanelOpen(p => !p);
        }}
        title="Write with Eral"
        style={{
          position: 'absolute',
          left: anchor.x,
          top: anchor.y,
          zIndex: 2147483640,
          width: 28,
          height: 28,
          borderRadius: 6,
          background: '#7c3aed',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.92,
          boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z"/>
          <path d="M19 15l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8L19 15z"/>
        </svg>
      </button>

      {/* Compose panel */}
      {panelOpen && (
        <div
          data-eral-compose
          style={{
            position: 'absolute',
            left: Math.max(8, anchor.x - 272),
            top: anchor.y + 36,
            zIndex: 2147483639,
            width: 300,
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['generate', 'improve'] as const).map(m => (
              <button
                key={m}
                data-eral-compose
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: mode === m ? '#7c3aed' : '#1e1e1e',
                  color: mode === m ? '#fff' : '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                {m === 'generate' ? '✨ Generate' : '✏️ Improve'}
              </button>
            ))}
          </div>

          {mode === 'generate' && (
            <textarea
              data-eral-compose
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
              Eral will improve the current text in the field.
            </div>
          )}

          <button
            data-eral-compose
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
            {loading ? 'Writing…' : 'Write with Eral'}
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
                  data-eral-compose
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
                  data-eral-compose
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
