'use client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full group transition-colors px-4 py-8 border-b border-white/[0.03] last:border-0 ${
        isUser ? 'bg-white/[0.01]' : 'bg-transparent'
      }`}
    >
      <div className="w-full max-w-2xl mx-auto flex gap-6">
        {/* Avatar/Indicator */}
        <div className="flex-shrink-0 w-8 h-8 flex items-start justify-center pt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] text-muted">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-[10px] text-white shadow-lg shadow-accent/20">
              ER
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold uppercase tracking-widest text-muted/60">
               {isUser ? 'You' : 'Nikita'}
             </span>
             {!isUser && (
               <span className="text-[9px] font-bold text-accent uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                 Assistant
               </span>
             )}
          </div>
          <div className="text-[15px] leading-[1.7] text-foreground/90 font-medium selection:bg-accent/20">
            <FormattedContent content={message.content} isUser={isUser} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormattedContent({ content, isUser }: { content: string; isUser: boolean }) {
  // Split into segments: code blocks vs regular text
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <div className="flex flex-col gap-4">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3);
          const newlineIdx = inner.indexOf('\n');
          const lang = newlineIdx > 0 ? inner.slice(0, newlineIdx).trim() : '';
          const code = newlineIdx > 0 ? inner.slice(newlineIdx + 1) : inner;
          return (
            <div key={i} className="my-2 group relative">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-t border-x border-border rounded-t-xl">
                 <span className="text-[10px] font-bold font-mono text-muted uppercase tracking-widest">
                   {lang || 'code'}
                 </span>
                 <button className="text-[10px] font-bold text-muted hover:text-white transition-colors uppercase tracking-widest">
                   Copy
                 </button>
              </div>
              <pre
                className="p-6 bg-[#0f0f0f] border border-border rounded-b-xl overflow-x-auto text-[13px] font-mono leading-7"
              >
                <code className="text-[#d1d1d1]">{code.trim()}</code>
              </pre>
            </div>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-white/10 text-[0.9em] font-mono text-accent"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        // Render plain text with line breaks preserved
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex w-full px-4 py-8">
      <div className="w-full max-w-2xl mx-auto flex gap-6">
        <div className="flex-shrink-0 w-8 h-8 flex items-start justify-center pt-1">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-[10px] text-white shadow-lg shadow-accent/20">
            ER
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1">
           <span className="text-xs font-bold uppercase tracking-widest text-muted/60">
             Nikita is writing
           </span>
           <div className="flex gap-1.5 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce"
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
