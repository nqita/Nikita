import { useEffect, useState, useCallback, useRef } from "react"
import "./style.css"
import { eralChat } from "@/lib/eral"

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

interface User {
  displayName: string
  email: string
  avatarUrl: string | null
}

interface ServerClip {
  id: string
  type: "text" | "link" | "image" | "social" | "page"
  content: string
  title: string | null
  sourceUrl: string
  createdAt: string
}

interface ChatMessage {
  role: "user" | "eral"
  content: string
}

function SidePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [clips, setClips] = useState<ServerClip[]>([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [clipStatus, setClipStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [activeTab, setActiveTab] = useState<"chat" | "clips" | "tools">("chat")
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "eral", content: "Hi! I'm Eral. I can read what's on this page — just ask me anything, or use the page context button below." },
  ])
  const [chatInput, setChatInput] = useState("")
  const [pageContext, setPageContext] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string>("")
  const [eralLoading, setEralLoading] = useState(false)
  const sessionId = useRef(crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  const loadServerClips = useCallback(async (q?: string) => {
    const { accessToken } = await chrome.storage.session.get(["accessToken"])
    if (!accessToken) return
    setClipsLoading(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (q) params.set("q", q)
      const res = await fetch(`${API_URL}/v1/clips?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setClips(data.data?.clips ?? [])
      }
    } catch {} finally {
      setClipsLoading(false)
    }
  }, [])

  useEffect(() => {
    chrome.storage.session.get(["user"]).then(({ user }) => {
      setUser(user ?? null)
      if (user) loadServerClips()
    })
    const sessionListener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.user) {
        setUser(changes.user.newValue ?? null)
        if (changes.user.newValue) loadServerClips()
        else setClips([])
      }
    }
    chrome.storage.session.onChanged.addListener(sessionListener)
    return () => chrome.storage.session.onChanged.removeListener(sessionListener)
  }, [loadServerClips])

  useEffect(() => {
    const timer = setTimeout(() => loadServerClips(searchQuery || undefined), 350)
    return () => clearTimeout(timer)
  }, [searchQuery, loadServerClips])

  const loadPageContext = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ title: document.title, text: document.body.innerText.slice(0, 8000) }),
      })
      const ctx = result as { title: string; text: string }
      setPageContext(ctx.title + "\n\n" + ctx.text)
      setPageTitle(ctx.title)
    } catch {}
  }, [])

  const handleSendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim()
    if (!text || eralLoading) return
    const { accessToken } = await chrome.storage.session.get(["accessToken"])
    if (!accessToken) return
    if (!overrideText) setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: text }])
    setEralLoading(true)
    try {
      const result = await eralChat(text, sessionId.current, {
        pageContext: pageContext ?? undefined,
        pageTitle: pageTitle || undefined,
        capabilities: ["sidepanel-chat"],
      })
      if (result) {
        setChatMessages((prev) => [...prev, { role: "eral", content: result.message || "…" }])
      } else {
        setChatMessages((prev) => [...prev, { role: "eral", content: "Something went wrong. Please try again." }])
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "eral", content: "Network error. Please try again." }])
    } finally {
      setEralLoading(false)
    }
  }, [chatInput, eralLoading, pageContext])

  const handleSummarizePage = useCallback(async () => {
    setSummaryStatus("loading")
    const res = await chrome.runtime.sendMessage({ type: "SUMMARIZE_PAGE" })
    if (res?.success && res.summary) {
      setActiveTab("chat")
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: "Summarize this page" },
        { role: "eral", content: res.summary },
      ])
      setSummaryStatus("done")
    } else {
      setSummaryStatus("error")
    }
    setTimeout(() => setSummaryStatus("idle"), 3000)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleClipPage = async () => {
    setClipStatus("loading")
    const res = await chrome.runtime.sendMessage({ type: "CLIP_CURRENT_PAGE" })
    setClipStatus(res?.success ? "done" : "error")
    if (res?.success) await loadServerClips(searchQuery || undefined)
    setTimeout(() => setClipStatus("idle"), 2000)
  }

  const handleDeleteClip = async (id: string) => {
    const { accessToken } = await chrome.storage.session.get(["accessToken"])
    if (!accessToken) return
    setDeletingId(id)
    try {
      await fetch(`${API_URL}/v1/clips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setClips((prev) => prev.filter((c) => c.id !== id))
    } catch {} finally {
      setDeletingId(null)
    }
  }

  const handleSignIn = (provider: "github" | "google") => {
    chrome.tabs.create({ url: `${API_URL}/v1/auth/${provider}?redirect_extension=true` })
  }

  const handleSignOut = async () => {
    const { refreshToken } = await chrome.storage.session.get(["refreshToken"])
    if (refreshToken) {
      fetch(`${API_URL}/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    await chrome.storage.session.clear()
    setUser(null)
    setClips([])
  }

  const clipIcon = (type: ServerClip["type"]) =>
    ({ text: "📝", link: "🔗", image: "🖼️", social: "💬", page: "📄" }[type] ?? "📎")

  const VIOLET = "#7c3aed"

  return (
    <div className="flex h-screen flex-col bg-[#09090b] text-[#fafafa] text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ color: VIOLET }} className="text-base">✦</span>
          <span className="font-semibold tracking-tight text-[13px]">Eral</span>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-[#27272a] flex items-center justify-center text-[9px] font-medium overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <button onClick={handleSignOut} className="text-xs text-[#71717a] hover:text-[#fafafa] transition-colors">
              Sign out
            </button>
          </div>
        )}
      </div>

      {!user ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: VIOLET }} className="text-xl">✦</span>
            <p className="text-sm font-medium">Sign in to use Eral</p>
          </div>
          <p className="text-xs text-[#a1a1aa]">Chat with any page, summarize, clip, and use AI on any website.</p>
          <div className="space-y-2 pt-2">
            {(["github", "google"] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => handleSignIn(provider)}
                className="flex w-full items-center gap-3 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#fafafa] hover:bg-[#27272a] transition-colors"
              >
                {provider === "github" ? "⬡" : "◎"} Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-[#27272a] flex-shrink-0">
            {(["chat", "clips", "tools"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); if (t === "clips") loadServerClips(searchQuery || undefined) }}
                className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
                  activeTab === t
                    ? "text-[#fafafa] border-b-2"
                    : "text-[#71717a] hover:text-[#a1a1aa]"
                }`}
                style={activeTab === t ? { borderColor: VIOLET } : {}}
              >
                {t === "clips" ? `Clips${clips.length > 0 ? ` (${clips.length})` : ""}` : t === "chat" ? "✦ Chat" : "Tools"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto flex flex-col min-h-0">

            {/* ── Chat Tab ── */}
            {activeTab === "chat" && (
              <div className="flex flex-col flex-1 h-full min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "eral" && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mr-1.5 mt-0.5" style={{ background: VIOLET }}>
                          ✦
                        </div>
                      )}
                      <div
                        className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          msg.role === "user"
                            ? "text-[#fafafa]"
                            : "bg-[#18181b] text-[#e4e4e7] border border-[#27272a]"
                        }`}
                        style={msg.role === "user" ? { background: VIOLET } : {}}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {eralLoading && (
                    <div className="flex justify-start items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0" style={{ background: VIOLET }}>
                        ✦
                      </div>
                      <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2">
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested actions */}
                {chatMessages.length === 1 && !eralLoading && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {["Summarize this page", "What's this about?", "Key points", "Explain simply"].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSendMessage(q)}
                        className="rounded-full border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-[11px] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-shrink-0 border-t border-[#27272a] p-2 space-y-2">
                  <button
                    onClick={loadPageContext}
                    className={`w-full rounded-lg border py-1.5 text-[10px] font-medium transition-colors ${
                      pageContext
                        ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]"
                        : "border-[#27272a] bg-[#18181b] text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#27272a]"
                    }`}
                  >
                    {pageContext ? `✓ "${pageTitle.slice(0, 30)}${pageTitle.length > 30 ? "…" : ""}" loaded` : "📋 Load page context"}
                  </button>

                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                      }}
                      placeholder="Ask Eral…"
                      rows={1}
                      className="flex-1 resize-none rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:outline-none min-h-[34px] max-h-[100px] overflow-y-auto"
                      style={{ focusBorderColor: VIOLET } as React.CSSProperties}
                      onFocus={(e) => { e.currentTarget.style.borderColor = VIOLET }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#27272a" }}
                      onInput={(e) => {
                        const el = e.currentTarget
                        el.style.height = "auto"
                        el.style.height = Math.min(el.scrollHeight, 100) + "px"
                      }}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!chatInput.trim() || eralLoading}
                      className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-40 transition-colors"
                      style={{ background: !chatInput.trim() || eralLoading ? "#27272a" : VIOLET }}
                    >
                      ↑
                    </button>
                  </div>

                  {chatMessages.length > 1 && (
                    <button
                      onClick={() => { setChatMessages([{ role: "eral", content: "Hi! I'm Eral. Ask me anything about this page." }]); sessionId.current = crypto.randomUUID(); setPageContext(null); setPageTitle("") }}
                      className="w-full text-[10px] text-[#52525b] hover:text-[#71717a] transition-colors"
                    >
                      Start new conversation
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Clips Tab ── */}
            {activeTab === "clips" && (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clips…"
                  className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:outline-none"
                  onFocus={(e) => { e.currentTarget.style.borderColor = VIOLET }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#27272a" }}
                />
                {clipsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: VIOLET, borderTopColor: "transparent" }} />
                  </div>
                ) : clips.length === 0 ? (
                  <p className="text-xs text-[#52525b] text-center py-6">
                    {searchQuery ? "No clips match your search." : "No clips yet. Clip a page to get started."}
                  </p>
                ) : (
                  clips.map((clip) => (
                    <div key={clip.id} className="group rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm flex-shrink-0 mt-0.5">{clipIcon(clip.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[#fafafa] truncate">
                            {clip.title || clip.content.slice(0, 60)}
                          </p>
                          <p className="text-[10px] text-[#52525b] truncate mt-0.5">
                            {new URL(clip.sourceUrl).hostname} · {new Date(clip.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          disabled={deletingId === clip.id}
                          className="ml-1 opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-[#ef4444] transition-all text-xs flex-shrink-0 disabled:opacity-30"
                          title="Delete clip"
                        >
                          {deletingId === clip.id ? "…" : "×"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tools Tab ── */}
            {activeTab === "tools" && (
              <div className="p-3 space-y-2">
                <button
                  onClick={handleClipPage}
                  disabled={clipStatus === "loading"}
                  className={`w-full rounded-lg py-2 text-xs font-medium transition-colors border ${
                    clipStatus === "done"
                      ? "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30"
                      : clipStatus === "error"
                      ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
                      : "text-white border-transparent hover:opacity-90"
                  } disabled:opacity-50`}
                  style={clipStatus === "idle" ? { background: VIOLET } : {}}
                >
                  {clipStatus === "loading" ? "Clipping…" : clipStatus === "done" ? "✓ Clipped!" : clipStatus === "error" ? "Failed — try again" : "📋 Clip Current Page"}
                </button>

                <button
                  onClick={handleSummarizePage}
                  disabled={summaryStatus === "loading"}
                  className={`w-full rounded-lg py-2 text-xs font-medium transition-colors border ${
                    summaryStatus === "done"
                      ? "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30"
                      : summaryStatus === "error"
                      ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
                      : "border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"
                  } disabled:opacity-50`}
                >
                  {summaryStatus === "loading" ? "Summarizing…" : summaryStatus === "done" ? "✓ Summarized!" : summaryStatus === "error" ? "Failed — try again" : "✦ Summarize Page"}
                </button>

                <div className="pt-1 space-y-1">
                  <p className="text-[10px] text-[#52525b] px-1 uppercase tracking-widest font-semibold">Apps</p>
                  {[
                    { label: "WokGen", url: "https://wokgen.wokspec.org", icon: "✦", desc: "AI content tools" },
                    { label: "WokPost", url: "https://wokpost.wokspec.org", icon: "◈", desc: "Publish & schedule" },
                    { label: "Chopsticks", url: "https://chopsticks.wokspec.org", icon: "⌘", desc: "Automation" },
                    { label: "Eral Dashboard", url: "https://eral.wokspec.org", icon: "✦", desc: "API keys & settings" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 hover:bg-[#27272a] transition-colors"
                    >
                      <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-[10px] text-[#71717a]">{item.desc}</p>
                      </div>
                      <span className="ml-auto text-[#52525b] text-xs">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default SidePanel
