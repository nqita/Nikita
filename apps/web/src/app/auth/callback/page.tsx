'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [message, setMessage] = useState('Completing sign in…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');

    if (!accessToken) {
      setStatus('error');
      setMessage('No access token received. Please try signing in again.');
      return;
    }

    // Store the WokSpec JWT as the Nikita token (Nikita Worker accepts WokSpec JWTs)
    localStorage.setItem('eral_token', accessToken);
    router.replace('/chat');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      {status === 'processing' ? (
        <>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          <p style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>{message}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <>
          <p style={{ color: '#f87171', fontSize: '0.9375rem' }}>{message}</p>
          <a href="/login" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'underline' }}>Back to sign in</a>
        </>
      )}
    </div>
  );
}
