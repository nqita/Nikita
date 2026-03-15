'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble, TypingIndicator, type Message } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { sendChat, getSessions, getSession, deleteSession } from '@/lib/nikita';

let msgCounter = 0;
function uid() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function ChatInterface() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const emitSessionsUpdate = useCallback((sess: string[], activeId?: string) => {
    window.dispatchEvent(
      new CustomEvent('nikita:sessions', { detail: { sessions: sess, activeSessionId: activeId } }),
    );
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await getSessions();
      const sess = res.data?.sessions ?? [];
      setSessions(sess);
      emitSessionsUpdate(sess, activeSessionId);
    } catch {
      // ignore
    }
  }, [activeSessionId, emitSessionsUpdate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const onNewChat = () => {
      setActiveSessionId(undefined);
      setMessages([]);
      setError(null);
    };
    const onSelectSession = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setActiveSessionId(id);
      setError(null);
      setIsLoading(true);
      try {
        const res = await getSession(id);
        const msgs: Message[] = (res.data?.messages ?? []).map((m) => ({
          id: uid(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        setMessages(msgs);
      } catch (err) {
        setError('Failed to load session.');
      } finally {
        setIsLoading(false);
      }
    };
    const onDeleteSession = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      try {
        await deleteSession(id);
        const next = sessions.filter((s) => s !== id);
        setSessions(next);
        emitSessionsUpdate(next, activeSessionId === id ? undefined : activeSessionId);
        if (activeSessionId === id) {
          setActiveSessionId(undefined);
          setMessages([]);
        }
      } catch {
        setError('Failed to delete session.');
      }
    };

    window.addEventListener('nikita:new-chat', onNewChat);
    window.addEventListener('nikita:select-session', onSelectSession as EventListener);
    window.addEventListener('nikita:delete-session', onDeleteSession as EventListener);
    return () => {
      window.removeEventListener('nikita:new-chat', onNewChat);
      window.removeEventListener('nikita:select-session', onSelectSession as EventListener);
      window.removeEventListener('nikita:delete-session', onDeleteSession as EventListener);
    };
  }, [sessions, activeSessionId, emitSessionsUpdate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (isLoading) return;
    setError(null);

    const userMsg: Message = { id: uid(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await sendChat(text, activeSessionId);
      
      if (res.error) {
        if (res.error.status === 401 && res.error.code === 'PAYMENT_REQUIRED') {
          window.dispatchEvent(new CustomEvent('nikita:auth-wall'));
        }
        throw new Error(res.error.message);
      }

      const newSessionId = res.data?.sessionId;
      const assistantMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: res.data?.response ?? '(no response)',
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (newSessionId && newSessionId !== activeSessionId) {
        setActiveSessionId(newSessionId);
        const next = sessions.includes(newSessionId) ? sessions : [newSessionId, ...sessions];
        setSessions(next);
        emitSessionsUpdate(next, newSessionId);
      }
      
      // Refresh credits after successful chat
      window.dispatchEvent(new CustomEvent('nikita:refresh-credits'));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(errMsg);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: `⚠️ ${errMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-2xl flex flex-col pt-12 pb-32">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center animate-in">
              <div className="w-16 h-16 rounded-[22px] bg-accent/10 border border-accent/20 flex items-center justify-center mb-8 shadow-2xl shadow-accent/5">
                <span className="text-2xl font-bold text-accent">ER</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-4">
                How can Nikita help you today?
              </h1>
              <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
                Integrated intelligence for the WokSpec ecosystem. 
                Ask about code, assets, or your build workflow.
              </p>
            </div>
          )}

          <div className="flex flex-col">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {isLoading && <TypingIndicator />}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {error && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 text-sm text-red-400">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             {error}
          </div>
        </div>
      )}

      {/* Input Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-8 px-4 flex justify-center pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto">
          <ChatInput onSend={handleSend} disabled={isLoading} />
          <p className="mt-4 text-[10px] text-center text-muted/40 uppercase tracking-[0.2em] font-bold">
            Nikita Intelligence — WokSpec Ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
