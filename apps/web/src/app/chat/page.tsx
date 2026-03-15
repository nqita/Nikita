'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';
import { Sidebar } from '@/components/Sidebar';
import { getCredits, type UserCredits } from '@/lib/nikita';

export default function ChatPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const refreshCredits = useCallback(async () => {
    const res = await getCredits();
    if (res.data) {
      setCredits(res.data);
    }
  }, []);

  useEffect(() => {
    const key = localStorage.getItem('eral_token') ?? '';
    setApiKey(key);
    setReady(true);
    refreshCredits();

    const handleRefresh = () => refreshCredits();
    const handleAuthWall = () => setShowAuthModal(true);
    
    window.addEventListener('nikita:refresh-credits', handleRefresh);
    window.addEventListener('nikita:auth-wall', handleAuthWall);
    
    return () => {
      window.removeEventListener('nikita:refresh-credits', handleRefresh);
      window.removeEventListener('nikita:auth-wall', handleAuthWall);
    };
  }, [refreshCredits]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const isFree = credits?.plan === 'free';
  const messagesLeft = 3 - (credits?.messages ?? 0);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar apiKey={apiKey} onSignOut={() => {
        localStorage.removeItem('eral_token');
        window.location.href = '/';
      }} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.03] bg-background/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg tracking-tight text-white">Nikita</span>
            {credits && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-px bg-white/10" />
                {isFree ? (
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    {messagesLeft > 0 ? `${messagesLeft} messages left` : 'Trial ended'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                    ${credits.balance.toFixed(2)} credits
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!apiKey && (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="text-xs font-bold text-white hover:text-accent transition-colors uppercase tracking-widest"
              >
                Sign In
              </button>
            )}
            <a href="/keys" className="text-[10px] font-bold text-muted/60 hover:text-white transition-colors uppercase tracking-widest border border-white/5 px-3 py-1.5 rounded-lg bg-white/[0.02]">
              API Keys
            </a>
          </div>
        </header>

        <ChatInterface />

        {/* Auth Wall Modal */}
        {showAuthModal && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-card border border-white/10 w-full max-w-md rounded-[32px] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] -mr-16 -mt-16" />
              
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 mx-auto">
                <span className="text-2xl font-bold text-accent">ER</span>
              </div>
              
              <h2 className="text-2xl font-bold text-white text-center mb-3">Continue with Nikita</h2>
              <p className="text-muted-foreground text-center text-sm leading-relaxed mb-10">
                You&apos;ve used your free messages. Sign in to unlock $0.05 in free credits and full access to WokSpec AI.
              </p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    // Redirect to GitHub OAuth flow
                    window.location.href = 'https://api.wokspec.org/auth/github?redirect=' + encodeURIComponent(window.location.href);
                  }}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-[0.98]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.518-1.304.962-1.607-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  Continue with GitHub
                </button>
                <button 
                  onClick={() => {
                    // Redirect to WokID / Email login
                    window.location.href = 'https://woksite.org/login?redirect=' + encodeURIComponent(window.location.href);
                  }}
                  className="w-full bg-white/5 text-white py-4 rounded-2xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  Continue with Email
                </button>
              </div>
              
              <button 
                onClick={() => setShowAuthModal(false)}
                className="mt-8 w-full text-[10px] font-bold text-muted/40 uppercase tracking-[0.2em] hover:text-muted/60 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
