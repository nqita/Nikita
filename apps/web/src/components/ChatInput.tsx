'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-accent/5 to-accent/20 rounded-[22px] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
      <div className="relative bg-[#0f0f0f] border border-white/[0.08] focus-within:border-accent/40 rounded-[20px] transition-all flex flex-col shadow-2xl">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Try Nikita free — Ask anything about WokSpec..."
          className="w-full bg-transparent border-none text-[15px] leading-relaxed text-foreground placeholder:text-muted/50 p-5 pr-16 outline-none resize-none font-medium custom-scrollbar min-h-[60px]"
          disabled={disabled}
        />
        <div className="flex items-center justify-between px-5 pb-4">
           <div className="flex items-center gap-4">
             <button className="text-muted hover:text-white transition-colors" title="Attach context">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
             </button>
             <div className="h-4 w-px bg-white/5" />
             <span className="text-[10px] font-bold text-muted/40 uppercase tracking-widest">
               {text.length} characters
             </span>
           </div>
           <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              text.trim() && !disabled
                ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-100'
                : 'bg-white/5 text-muted scale-95 opacity-50'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
