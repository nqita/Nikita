'use client';

import { useState } from 'react';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-pink-200/20 bg-pink-950/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-300 text-pink-950 flex items-center justify-center font-bold text-xs shadow-lg shadow-pink-300/40">
            NK
          </div>
          <span className="font-semibold text-lg tracking-tight">Nikita</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-200/70">Private Preview</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-300/15 border border-pink-200/30 text-xs font-semibold uppercase tracking-[0.25em] text-pink-200">
            Waitlist Open
          </p>
          <h1 className="mt-8 text-4xl md:text-6xl font-extrabold leading-tight">
            Nikita is in active development.
          </h1>
          <p className="mt-6 text-base md:text-lg text-pink-100/80 leading-relaxed">
            We&apos;re building the intelligence layer for WokSpec products. If you want early access,
            join the waitlist and we&apos;ll reach out.
          </p>

          <form
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            onSubmit={(event) => {
              event.preventDefault();
              if (!email) return;
              setSubmitted(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full sm:w-[320px] px-4 py-3 rounded-xl bg-pink-950/60 border border-pink-200/30 text-pink-50 placeholder:text-pink-200/50 focus:outline-none focus:ring-2 focus:ring-pink-300/60"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-pink-300 text-pink-950 font-semibold hover:bg-pink-200 transition-colors"
            >
              {submitted ? 'You are on the list' : 'Join waitlist'}
            </button>
          </form>

          {submitted && (
            <p className="mt-6 text-sm text-pink-200/80">
              Thanks. We&apos;ll reach out when the preview opens.
            </p>
          )}

          <div className="mt-12 text-xs text-pink-200/60">
            nikita.wokspec.org
          </div>
        </div>
      </main>
    </div>
  );
}

