import "./welcome.css"

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

const features = [
  {
    icon: "✦",
    title: "AI Chat on Any Page",
    desc: "Ask Nikita about any webpage you're browsing. Summarize articles, explain concepts, extract data — all without leaving the tab.",
  },
  {
    icon: "⬡",
    title: "Selection Toolbar",
    desc: "Select any text and instantly Explain, Summarize, Improve or Ask Nikita. A floating toolbar appears right next to your selection.",
  },
  {
    icon: "📋",
    title: "Clip & Save",
    desc: "Save any page, selection, or link to your Nikita library with one click. Searchable and synced across devices.",
  },
  {
    icon: "⬇️",
    title: "Media Downloader",
    desc: "Download videos from YouTube, Instagram, TikTok, Reddit, and more in your preferred format.",
  },
]

const VIOLET = "#7c3aed"

function WelcomePage() {
  const handleSignIn = (provider: "github" | "google") => {
    chrome.tabs.create({ url: `${API_URL}/v1/auth/${provider}?redirect_extension=true` })
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center px-6 py-16">
      {/* Logo + headline */}
      <div className="mb-12 text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white text-3xl mb-5"
          style={{ background: VIOLET }}
        >
          ✦
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Welcome to Nikita</h1>
        <p className="text-[#a1a1aa] text-lg max-w-md">
          Your AI browser extension. Chat with any page, summarize, clip, and more.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-12">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5">
            <div className="text-2xl mb-3" style={f.icon === "✦" || f.icon === "⬡" ? { color: VIOLET } : {}}>{f.icon}</div>
            <h2 className="text-sm font-semibold mb-1">{f.title}</h2>
            <p className="text-xs text-[#71717a] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Sign in */}
      <div className="w-full max-w-sm">
        <p className="text-center text-sm text-[#a1a1aa] mb-4">
          Sign in to enable all features
        </p>
        <div className="space-y-3">
          <button
            onClick={() => handleSignIn("github")}
            className="flex w-full items-center gap-3 rounded-xl border border-[#27272a] bg-[#18181b] px-5 py-3 text-sm font-medium text-[#fafafa] hover:bg-[#27272a] transition-colors"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .5C5.647.5.5 5.647.5 12c0 5.086 3.292 9.387 7.863 10.912.575.105.784-.249.784-.552v-2.14c-3.196.695-3.869-1.375-3.869-1.375-.522-1.327-1.275-1.681-1.275-1.681-1.044-.714.079-.699.079-.699 1.153.081 1.76 1.184 1.76 1.184 1.025 1.754 2.691 1.248 3.349.954.104-.742.4-1.248.729-1.535-2.552-.29-5.237-1.276-5.237-5.68 0-1.255.448-2.28 1.183-3.085-.119-.29-.513-1.461.112-3.048 0 0 .964-.308 3.158 1.177A10.986 10.986 0 0 1 12 6.62c.976.004 1.96.131 2.878.386 2.192-1.485 3.154-1.177 3.154-1.177.627 1.587.233 2.758.114 3.048.737.805 1.182 1.83 1.182 3.085 0 4.416-2.689 5.387-5.251 5.67.413.355.78 1.057.78 2.13v3.159c0 .305.207.661.789.549C20.21 21.384 23.5 17.085 23.5 12 23.5 5.647 18.353.5 12 .5Z"/>
            </svg>
            Continue with GitHub
          </button>
          <button
            onClick={() => handleSignIn("google")}
            className="flex w-full items-center gap-3 rounded-xl border border-[#27272a] bg-[#18181b] px-5 py-3 text-sm font-medium text-[#fafafa] hover:bg-[#27272a] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
        <p className="text-center text-xs text-[#52525b] mt-4">
          You can also sign in later from the extension popup.
        </p>
      </div>

      {/* Footer links */}
      <div className="mt-12 flex gap-5 text-xs text-[#52525b]">
        <a href="https://nikita.wokspec.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#a1a1aa]">Nikita</a>
        <a href="https://nikita.wokspec.org/docs" target="_blank" rel="noopener noreferrer" className="hover:text-[#a1a1aa]">Docs</a>
        <a href="https://wokspec.org/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#a1a1aa]">Privacy</a>
        <a
          onClick={() => chrome.runtime.openOptionsPage()}
          className="hover:text-[#a1a1aa] cursor-pointer"
        >
          Settings
        </a>
      </div>
    </div>
  )
}

export default WelcomePage
