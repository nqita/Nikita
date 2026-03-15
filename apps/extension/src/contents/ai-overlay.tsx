import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { eralChat } from "@/lib/nikita"

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
        ? "Please sign in to your WokSpec account to use Nikita AI."
        : "Failed to connect to Nikita service. Please check your network."
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 2147483646,
          width: "48px", height: "48px", borderRadius: "14px",
          background: VIOLET, color: "white", border: "none", cursor: "pointer",
          fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(124,58,237,0.3)",
          transition: "all 0.2s ease",
          letterSpacing: "0.05em",
        }}
        aria-label="Open Nikita AI"
        title="Ask Nikita"
      >
        ER
      </button>
    )
  }

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 2147483646,
      width: "380px", height: "540px", borderRadius: "20px", background: "#0d0d0d",
      border: "1px solid #2a2a2a", boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #222", flexShrink: 0, background: "#141414" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "24px", height: "24px", background: VIOLET, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "800", color: "white" }}>ER</div>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>Nikita Intelligence</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888", cursor: "pointer", fontSize: "14px", width: "24px", height: "24px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      </div>

      {/* Conversation thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: VIOLET, fontWeight: "800", fontSize: "14px", marginBottom: "16px" }}>ER</div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>How can I help?</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Analyze or ask anything about this page.</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%", padding: "12px 16px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? VIOLET : "#1a1a1a",
              border: msg.role === "user" ? "none" : "1px solid #2a2a2a",
              color: "#fff", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap",
              boxShadow: msg.role === "user" ? "0 4px 12px rgba(124,58,237,0.2)" : "none",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666", fontSize: "14px" }}>
              Processing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 20px 20px", borderTop: "1px solid #222", flexShrink: 0, background: "#111" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "14px", padding: "2px" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askEral() } }}
            placeholder="Ask anything about this page…"
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#fff", fontSize: "14px", padding: "10px 14px",
              resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.5,
              minHeight: "42px",
            }}
            rows={2}
          />
          <button
            onClick={askEral}
            disabled={!prompt.trim() || loading}
            style={{
              width: "34px", height: "34px", margin: "4px", borderRadius: "10px",
              background: loading || !prompt.trim() ? "#333" : VIOLET,
              color: "white", border: "none", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            title="Send (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "12px", fontWeight: "600" }}>Powered by WokSpec</div>
      </div>
    </div>
  )
}

export default AIOverlay

