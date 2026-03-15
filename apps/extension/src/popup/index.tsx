import { useEffect, useState } from "react"
import "./style.css"
import { MediaDownloader } from "./MediaDownloader"

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"
const VIOLET = "#7c3aed"

interface User {
  displayName: string
  email: string
  avatarUrl: string | null
}

function Popup() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"actions" | "downloader">("actions")
  const [actionStatus, setActionStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({})

  useEffect(() => {
    chrome.storage.session.get(["accessToken", "user"]).then(({ user }) => {
      setUser(user ?? null)
      setLoading(false)
    })

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.user) setUser(changes.user.newValue ?? null)
      if (changes.accessToken && !changes.accessToken.newValue) setUser(null)
    }
    chrome.storage.session.onChanged.addListener(listener)
    return () => chrome.storage.session.onChanged.removeListener(listener)
  }, [])

  const handleSignIn = (provider: "github" | "google") => {
    chrome.tabs.create({ url: `${API_URL}/v1/auth/${provider}?redirect_extension=true` })
    window.close()
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
  }

  const setStatus = (key: string, status: "idle" | "loading" | "done" | "error") => {
    setActionStatus((s) => ({ ...s, [key]: status }))
    if (status === "done" || status === "error") {
      setTimeout(() => setActionStatus((s) => ({ ...s, [key]: "idle" })), 2500)
    }
  }

  const handleClipPage = async () => {
    setStatus("clip", "loading")
    const res = await chrome.runtime.sendMessage({ type: "CLIP_CURRENT_PAGE" })
    setStatus("clip", res?.success ? "done" : "error")
  }

  const handleSaveLink = async () => {
    setStatus("save", "loading")
    const res = await chrome.runtime.sendMessage({ type: "SAVE_CURRENT_URL" })
    setStatus("save", res?.success ? "done" : "error")
  }

  const handleSummarizePage = async () => {
    setStatus("summarize", "loading")
    const res = await chrome.runtime.sendMessage({ type: "SUMMARIZE_PAGE" })
    if (res?.success) {
      setStatus("summarize", "done")
      // Open sidepanel to show the result
      chrome.sidePanel?.open?.({ windowId: undefined as unknown as number }).catch(() => {})
    } else {
      setStatus("summarize", "error")
    }
  }

  const handleOpenSidePanel = () => {
    chrome.sidePanel?.open?.({ windowId: undefined as unknown as number }).catch(() => {})
    window.close()
  }

  if (loading) {
    return (
      <div className="flex h-32 w-80 items-center justify-center bg-[#09090b]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: VIOLET, borderTopColor: "transparent" }} />
      </div>
    )
  }

  const quickActions = [
    {
      key: "sidepanel",
      icon: "✦",
      label: "Ask Nikita",
      onClick: handleOpenSidePanel,
      violet: true,
    },
    {
      key: "summarize",
      icon: actionStatus.summarize === "done" ? "✓" : actionStatus.summarize === "error" ? "✗" : "∑",
      label: actionStatus.summarize === "done" ? "Summarized!" : actionStatus.summarize === "error" ? "Failed" : "Summarize Page",
      onClick: handleSummarizePage,
      loading: actionStatus.summarize === "loading",
    },
    {
      key: "clip",
      icon: actionStatus.clip === "done" ? "✓" : actionStatus.clip === "error" ? "✗" : "📋",
      label: actionStatus.clip === "done" ? "Clipped!" : actionStatus.clip === "error" ? "Failed" : "Clip Page",
      onClick: handleClipPage,
      loading: actionStatus.clip === "loading",
    },
    {
      key: "downloader",
      icon: "⬇️",
      label: "Download Media",
      onClick: () => setTab("downloader"),
    },
    {
      key: "save",
      icon: actionStatus.save === "done" ? "✓" : actionStatus.save === "error" ? "✗" : "💾",
      label: actionStatus.save === "done" ? "Saved!" : actionStatus.save === "error" ? "Failed" : "Save Link",
      onClick: handleSaveLink,
      loading: actionStatus.save === "loading",
    },
    {
      key:  "studio",
      icon: "◈",
      label: "Open Studio",
      onClick: () => chrome.tabs.create({ url: "https://studio.wokspec.org" }),
    },
  ]

  return (
    <div className="w-80 bg-[#09090b] text-[#fafafa]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
        <div className="flex items-center gap-2">
          <span style={{ color: VIOLET }} className="text-base">✦</span>
          <span className="text-sm font-semibold tracking-tight">Nikita</span>
        </div>
        <a
          href="https://nikita.wokspec.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
        >
          nikita.wokspec.org ↗
        </a>
      </div>

      {user ? (
        <div className="p-4">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-medium overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                user.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-[#71717a] truncate">{user.email}</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 rounded-lg bg-[#18181b] p-1 border border-[#27272a]">
            <button
              onClick={() => setTab("actions")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === "actions" ? "bg-[#27272a] text-[#fafafa]" : "text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              Quick Actions
            </button>
            <button
              onClick={() => setTab("downloader")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === "downloader" ? "bg-[#27272a] text-[#fafafa]" : "text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              Downloader
            </button>
          </div>

          {tab === "actions" ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickActions.map((item) => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  disabled={item.loading}
                  className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-colors text-left disabled:opacity-50"
                  style={(item as { violet?: boolean }).violet ? { borderColor: VIOLET, color: VIOLET } : {}}
                >
                  <span>{item.loading ? "…" : item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <MediaDownloader />
          )}

          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-[#27272a] py-2 text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: VIOLET }} className="text-xl">✦</span>
            <p className="text-sm font-medium">Sign in to Nikita</p>
          </div>
          <p className="text-xs text-[#a1a1aa] mb-4">
            Chat with any page, summarize content, clip pages, and download media.
          </p>
          <div className="space-y-2">
            {[
              { provider: "github" as const, label: "Continue with GitHub", icon: "⬡" },
              { provider: "google" as const, label: "Continue with Google", icon: "◎" },
            ].map(({ provider, label, icon }) => (
              <button
                key={provider}
                onClick={() => handleSignIn(provider)}
                className="flex w-full items-center gap-3 rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2.5 text-sm text-[#fafafa] hover:bg-[#27272a] transition-colors"
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Popup

