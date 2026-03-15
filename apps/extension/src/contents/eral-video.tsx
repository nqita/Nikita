/**
 * nikita-video.tsx
 * Detects YouTube/video pages and injects a "Summarize with Nikita" button
 * near the video title. Sends a SUMMARIZE_PAGE message to the background
 * worker which calls Nikita /v1/analyze, then shows the summary in a panel.
 */
import type { PlasmoCSConfig } from 'plasmo';
import { useEffect, useRef, useState } from 'react';

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.youtube.com/watch*',
    'https://youtube.com/watch*',
    'https://youtu.be/*',
    'https://vimeo.com/*',
    'https://www.twitch.tv/*',
  ],
  all_frames: false,
};

// ---------- helpers ----------------------------------------------------------

function getVideoTitle(): string {
  // YouTube
  const ytTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string');
  if (ytTitle) return ytTitle.textContent?.trim() ?? '';
  // Vimeo
  const vmTitle = document.querySelector('.clip_main_wrapper h1, [data-test="video-title"]');
  if (vmTitle) return vmTitle.textContent?.trim() ?? '';
  // Generic OG
  const og = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
  return og?.content?.trim() ?? document.title;
}

function getVideoDescription(): string {
  // YouTube description
  const ytDesc = document.querySelector('#description-inline-expander yt-attributed-string, #description .ytd-video-secondary-info-renderer');
  if (ytDesc) return ytDesc.textContent?.slice(0, 2000)?.trim() ?? '';
  // Vimeo
  const vmDesc = document.querySelector('.description_wrapper p, [data-test="video-description"]');
  if (vmDesc) return vmDesc.textContent?.slice(0, 2000)?.trim() ?? '';
  return '';
}

// ---------- main component ---------------------------------------------------

function VideoSummarizeButton() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [visible, setVisible] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wait for YouTube's dynamic title to appear
  useEffect(() => {
    let attempts = 0;
    const check = () => {
      const hasTitle = !!document.querySelector(
        'h1.ytd-watch-metadata, h1.ytd-video-primary-info-renderer, h1[data-test="video-title"], #videotitle'
      );
      if (hasTitle) {
        setVisible(true);
      } else if (attempts++ < 20) {
        pollRef.current = setTimeout(check, 500);
      }
    };
    check();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  // Re-check on YouTube SPA navigation
  useEffect(() => {
    const onYtNavFin = () => {
      setSummary('');
      setLoading(false);
      setVisible(true);
    };
    document.addEventListener('yt-navigate-finish', onYtNavFin);
    return () => document.removeEventListener('yt-navigate-finish', onYtNavFin);
  }, []);

  async function summarize() {
    setLoading(true);
    setSummary('');
    const title = getVideoTitle();
    const description = getVideoDescription();
    const content = `Video: "${title}"\n\n${description}`.trim();

    try {
      const response = await new Promise<{ summary?: string; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'SUMMARIZE_PAGE', content, title, isVideo: true },
          (res) => resolve(res ?? { error: 'No response' })
        );
      });
      setSummary(response.summary ?? response.error ?? 'Could not summarize.');
    } catch {
      setSummary('Failed to reach Nikita. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={{
      marginTop: 12,
      marginBottom: 4,
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 680,
      width: '100%',
    }}>
      {!summary && (
        <button
          onClick={summarize}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: loading ? '#3b1f7a' : '#7c3aed',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 14px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.8 : 1,
            transition: 'background 0.15s, opacity 0.15s',
            alignSelf: 'flex-start',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z"/>
            <path d="M19 15l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8L19 15z"/>
          </svg>
          {loading ? 'Summarizing…' : 'Summarize with Nikita'}
        </button>
      )}

      {summary && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #2a2a2a',
          borderLeft: '3px solid #7c3aed',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 13.5,
          color: '#e0e0e0',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 12 }}>✦ ERAL SUMMARY</span>
            <button
              onClick={() => setSummary('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '2px 4px',
              }}
              title="Dismiss"
            >×</button>
          </div>
          {summary}
        </div>
      )}
    </div>
  );
}

// Plasmo requires a default export for content scripts
export default VideoSummarizeButton;

// We need to inject this into the page DOM adjacent to the video title.
// Plasmo's Shadow DOM won't work here because YouTube is highly dynamic.
// Instead we export a getInlineAnchor so Plasmo puts the component inline.
export const getInlineAnchor = () => {
  return (
    document.querySelector('#above-the-fold #title') ??
    document.querySelector('h1.ytd-watch-metadata') ??
    document.querySelector('[data-test="video-title"]') ??
    document.querySelector('#videotitle') ??
    null
  );
};
