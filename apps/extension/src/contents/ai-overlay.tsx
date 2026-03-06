import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { eralChat } from "@/lib/eral"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

interface Message {
  role: "user" | "assistant"
  content: string
}

function AIOverlay() {
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(crypto.randomUUID())

  useEffect(() => {
    const checkSetting = async () => {
      const { settings } = await chrome.storage.sync.get(["settings"])
      setVisible(settings?.showAIButton !== false)
    }
    checkSetting()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.settings) setVisible(changes.settings.newValue?.showAIButton !== false)
    }
    chrome.storage.sync.onChanged.addListener(listener)

    // Listen for context menu "Ask Eral" / "Explain with Eral" triggers
    const msgListener = (msg: { type: string; text?: string }) => {
      if (msg.type === "ERAL_ASK" && msg.text) {
        setOpen(true)
        setPrompt(msg.text)
      } else if (msg.type === "ERAL_EXPLAIN" && msg.text) {
        setOpen(true)
        askEralWithText(`Explain this: ${msg.text}`)
      }
    }
    chrome.runtime.onMessage.addListener(msgListener)

    return () => {
      chrome.storage.sync.onChanged.removeListener(listener)
      chrome.runtime.onMessage.removeListener(msgListener)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  if (!visible) return null

  const askEralWithText = async (text: string) => {
    if (!text.trim() || loading) return
    setLoading(true)
    const updatedMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(updatedMessages)
    const pageContext = `Page: ${document.title}\nURL: ${location.href}\n\n${document.body.innerText?.slice(0, 4000) || ""}`
    const result = await eralChat(text, sessionId.current, {
      pageContext,
      pageUrl: location.href,
      pageTitle: document.title,
      capabilities: ["overlay-chat"],
    })
    if (result) {
      setMessages([...updatedMessages, { role: "assistant", content: result.message }])
    } else {
      const { accessToken } = await chrome.storage.session.get(["accessToken"])
      const errMsg = !accessToken
        ? "Sign in to use Eral AI features."
        : "Connection error — check your network."
      setMessages([...updatedMessages, { role: "assistant", content: errMsg }])
    }
    setLoading(false)
  }

  const askEral = async () => {
    if (!prompt.trim() || loading) return
    const text = prompt.trim()
    setPrompt("")
    await askEralWithText(text)
  }

  const VIOLET = "#7c3aed"
  const VIOLET_SHADOW = "rgba(124,58,237,0.4)"

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 2147483646,
          width: "40px", height: "40px", borderRadius: "50%",
          background: VIOLET, color: "white", border: "none", cursor: "pointer",
          fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${VIOLET_SHADOW}`,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        aria-label="Open Eral AI"
        title="Ask Eral"
      >
        ✦
      </button>
    )
  }

  return (
    <div style={{
      position: "fixed", bottom: "20px", right: "20px", zIndex: 2147483646,
      width: "340px", height: "460px", borderRadius: "12px", background: "#09090b",
      border: "1px solid #27272a", boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #27272a", flexShrink: 0, background: "#0c0c0f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: VIOLET, fontSize: "16px" }}>✦</span>
          <span style={{ color: "#fafafa", fontSize: "13px", fontWeight: 600 }}>Eral</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); sessionId.current = crypto.randomUUID() }}
              style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}
              title="New conversation"
            >
              New chat
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
      </div>

      {/* Conversation thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.length === 0 && (
          <div style={{ color: "#52525b", fontSize: "12px", textAlign: "center", marginTop: "32px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px", color: VIOLET }}>✦</div>
            Ask anything about this page
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? VIOLET : "#18181b",
              border: msg.role === "user" ? "none" : "1px solid #27272a",
              color: "#fafafa", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "8px 14px", borderRadius: "12px 12px 12px 2px", background: "#18181b", border: "1px solid #27272a", color: "#71717a", fontSize: "12px" }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #27272a", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askEral() } }}
            placeholder="Ask about this page… (Enter to send)"
            style={{
              flex: 1, background: "#18181b", border: "1px solid #27272a",
              borderRadius: "8px", color: "#fafafa", fontSize: "12px", padding: "8px 10px",
              resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5,
            }}
            rows={2}
          />
          <button
            onClick={askEral}
            disabled={!prompt.trim() || loading}
            style={{
              background: loading || !prompt.trim() ? "#27272a" : VIOLET,
              color: loading || !prompt.trim() ? "#52525b" : "white",
              border: "none", borderRadius: "8px", padding: "0 12px",
              fontSize: "16px", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
            title="Send (Enter)"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIOverlay

