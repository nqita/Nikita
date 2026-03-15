'use client';

import { useState, useEffect } from 'react';

interface Props {
  apiKey: string;
  onSignOut: () => void;
}

export function Sidebar({ apiKey, onSignOut }: Props) {
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const { sessions: sess, activeSessionId: activeId } = (e as CustomEvent).detail;
      setSessions(sess);
      setActiveSessionId(activeId);
    };
    window.addEventListener('nikita:sessions', handleUpdate);
    return () => window.removeEventListener('nikita:sessions', handleUpdate);
  }, []);

  const onNewChat = () => {
    window.dispatchEvent(new CustomEvent('nikita:new-chat'));
  };

  const onSelectSession = (id: string) => {
    window.dispatchEvent(new CustomEvent('nikita:select-session', { detail: id }));
  };

  const onDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('nikita:delete-session', { detail: id }));
  };

  return (
    <aside className="w-72 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full z-30 transition-all overflow-hidden hidden md:flex">
      {/* Sidebar Header */}
      <div className="p-6">
        <button
          onClick={onNewChat}
          className="w-full bg-white hover:bg-white/90 text-black py-3 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-2xl active:scale-[0.98] group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:rotate-90" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <div className="flex flex-col gap-1.5 py-4">
          <span className="px-4 text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 opacity-50">
            Recent Activity
          </span>
          {sessions.length === 0 && (
            <div className="px-4 py-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-xs text-muted/60 leading-relaxed font-medium">
                Your recent conversations will appear here.
              </p>
            </div>
          )}
          {sessions.map((id) => (
            <button
              key={id}
              onClick={() => onSelectSession(id)}
              className={`group flex items-center justify-between w-full p-3.5 rounded-2xl text-left text-sm font-medium transition-all relative overflow-hidden ${
                activeSessionId === id
                  ? 'bg-accent/10 text-white border border-accent/20'
                  : 'hover:bg-white/[0.04] text-muted hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={activeSessionId === id ? 'text-accent' : 'text-muted/40'}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                 <span className="truncate">{id}</span>
              </div>
              <button
                onClick={(e) => onDeleteSession(e, id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-red-400 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-6 flex flex-col gap-4 border-t border-white/5 bg-[#080808]">
        <div className="flex items-center gap-4 px-2">
           <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center font-bold text-xs text-accent">
             ER
           </div>
           <div className="flex flex-col min-w-0">
             <span className="text-sm font-bold text-white truncate">WokSpec Member</span>
             <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Premium Tier</span>
           </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-white/5 text-muted hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-widest"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
