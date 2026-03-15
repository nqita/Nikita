'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/nikita';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

const accent = '#7c3aed';
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem' };
const input: React.CSSProperties = { background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.9rem', outline: 'none', flex: 1 };
const btn = (variant: 'primary' | 'danger' | 'ghost'): React.CSSProperties => ({
  background: variant === 'primary' ? accent : variant === 'danger' ? 'rgba(239,68,68,0.12)' : 'transparent',
  color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#f87171' : 'var(--muted)',
  border: `1px solid ${variant === 'primary' ? accent : variant === 'danger' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
  borderRadius: '0.625rem',
  padding: variant === 'ghost' ? '0.375rem 0.75rem' : '0.625rem 1.25rem',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  transition: 'opacity 0.15s',
});

export default function KeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listApiKeys();
      setKeys(res.data?.keys ?? []);
    } catch {
      setError('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('eral_token');
    if (!token) { router.replace('/login'); return; }
    load();
  }, [router, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newKeyName.trim() || 'My App';
    setCreating(true);
    setError(null);
    try {
      const res = await createApiKey(name);
      setNewKeyValue(res.data.key);
      setNewKeyName('');
      await load();
    } catch {
      setError('Failed to create API key.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this key? It will stop working immediately.')) return;
    setRevoking(id);
    try {
      await revokeApiKey(id);
      setKeys((k) => k.filter((x) => x.id !== id));
    } catch {
      setError('Failed to revoke key.');
    } finally {
      setRevoking(null);
    }
  };

  const copyKey = () => {
    if (!newKeyValue) return;
    navigator.clipboard.writeText(newKeyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <a href="/chat" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '1.75rem', height: '1.75rem', background: accent, borderRadius: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>E</div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Nikita</span>
        </a>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
          <a href="/chat" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Chat</a>
          <a href="/keys" style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>API Keys</a>
        </div>
      </nav>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.375rem' }}>API Keys</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>
            Use API keys to embed the Nikita widget on any website or call the Nikita API directly.
          </p>
        </div>

        {/* New key revealed */}
        {newKeyValue && (
          <div style={{ ...card, borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.07)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: accent }}>🎉 Key created — copy it now, it won't be shown again.</p>
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
              <code style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.85rem', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>{newKeyValue}</code>
              <button style={btn('ghost')} onClick={copyKey}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Embed on your site:
            </p>
            <pre style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.78rem', fontFamily: 'ui-monospace, monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '0.375rem' }}>{`<script src="https://nikita.wokspec.org/api/widget.js"\n        data-nikita-key="${newKeyValue}"\n        data-nikita-name="Nikita"\n        data-nikita-position="bottom-right">\n</script>`}</pre>
            <button style={{ ...btn('ghost'), marginTop: '0.75rem', fontSize: '0.8125rem' }} onClick={() => setNewKeyValue(null)}>Dismiss</button>
          </div>
        )}

        {/* Create form */}
        <div style={card}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Create new key</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. My Website)"
              maxLength={100}
              style={input}
            />
            <button type="submit" disabled={creating} style={{ ...btn('primary'), opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
          {error && <p style={{ fontSize: '0.8125rem', color: '#f87171', marginTop: '0.625rem' }}>{error}</p>}
        </div>

        {/* Key list */}
        <div style={card}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
            Your keys {!loading && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.875rem' }}>({keys.length})</span>}
          </h2>
          {loading ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</p>
          ) : keys.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No keys yet. Create one above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {keys.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>{k.name || 'Unnamed'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: 'ui-monospace, monospace' }}>
                      {k.id.slice(0, 12)}… · Created {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    style={{ ...btn('danger'), opacity: revoking === k.id ? 0.6 : 1 }}
                    disabled={revoking === k.id}
                    onClick={() => handleRevoke(k.id)}
                  >
                    {revoking === k.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage docs */}
        <div style={{ ...card, background: 'transparent', borderStyle: 'dashed' }}>
          <h2 style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.875rem' }}>Quick reference</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            <div>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Widget embed</span> — add the script tag to your HTML, pass your key as <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', background: 'var(--background)', padding: '0.1em 0.35em', borderRadius: '4px' }}>data-nikita-key</code>
            </div>
            <div>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Direct API</span> — send <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', background: 'var(--background)', padding: '0.1em 0.35em', borderRadius: '4px' }}>Authorization: Bearer eral_…</code> to <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', background: 'var(--background)', padding: '0.1em 0.35em', borderRadius: '4px' }}>nikita.wokspec.org/api/v1/chat</code>
            </div>
            <div>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>Rate limits</span> — 30 requests/min per key on the free tier
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
