'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WOKAPI = 'https://api.wokspec.org';
const ERAL_CALLBACK = 'https://nikita.wokspec.org/auth/callback';

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem('eral_token');
    if (existing) router.replace('/chat');
  }, [router]);

  const oauthHref = (provider: string) => {
    const url = new URL(`${WOKAPI}/v1/auth/${provider}`);
    url.searchParams.set('redirect_to', ERAL_CALLBACK);
    url.searchParams.set('redirect_extension', 'true');
    return url.toString();
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = apiKey.trim();
    if (!trimmed) { setError('Please enter your API key.'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('https://nikita.wokspec.org/api/v1/status', {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.status === 401) {
        setError('Invalid API key. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
      localStorage.setItem('eral_token', trimmed);
      router.push('/chat');
    } catch {
      localStorage.setItem('eral_token', trimmed);
      router.push('/chat');
    }
  };

  const divider: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
    color: 'var(--muted)', fontSize: '0.8rem',
  };
  const line: React.CSSProperties = { flex: 1, height: 1, background: 'var(--border)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '2.5rem 2rem', width: '100%', maxWidth: '24rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', background: 'var(--accent)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.375rem', color: '#fff', margin: '0 auto 1rem' }}>E</div>
          <h1 style={{ fontWeight: 700, fontSize: '1.375rem', color: 'var(--foreground)', marginBottom: '0.375rem' }}>Sign in to Nikita</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Use your WokSpec account or an API key.</p>
        </div>

        {/* OAuth buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[
            { provider: 'github', label: 'Continue with GitHub', icon: '🐙' },
            { provider: 'google', label: 'Continue with Google', icon: '🔵' },
            { provider: 'discord', label: 'Continue with Discord', icon: '🎮' },
          ].map(({ provider, label, icon }) => (
            <a key={provider} href={oauthHref(provider)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontWeight: 500, fontSize: '0.9375rem', textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <span>{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>

        {/* Divider */}
        <div style={divider}><div style={line} /><span>or</span><div style={line} /></div>

        {/* Developer API key */}
        {!showKeyForm ? (
          <button onClick={() => setShowKeyForm(true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '0.75rem', padding: '0.625rem 1rem', width: '100%', fontSize: '0.875rem', cursor: 'pointer' }}>
            Use API key (developer)
          </button>
        ) : (
          <form onSubmit={handleApiKeySubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="eral_..." autoFocus
              style={{ background: 'var(--background)', color: 'var(--foreground)', border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'var(--border)'}`, borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.9rem', fontFamily: 'ui-monospace, monospace', outline: 'none', width: '100%' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'var(--border)')}
            />
            {error && <p style={{ fontSize: '0.8125rem', color: '#f87171', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? 'var(--border)' : 'var(--accent)', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9375rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', width: '100%' }}>
              {isSubmitting ? 'Signing in…' : 'Continue with API key'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
