import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef, useCallback } from "react"
import { eralAnalyze, eralGenerate, getAccessToken, type AnalyzeType } from "@/lib/nikita"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
}

const VIOLET = "#7c3aed"
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface ToolbarState {
  visible: boolean
  x: number
  y: number
  text: string
}

interface ResultState {
  visible: boolean
  loading: boolean
  content: string
  type: string
}

function EralSelectionToolbar() {
  const [enabled, setEnabled] = useState(true)
  const [toolbar, setToolbar] = useState<ToolbarState>({ visible: false, x: 0, y: 0, text: "" })
  const [result, setResult] = useState<ResultState>({ visible: false, loading: false, content: "", type: "" })
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkSetting = async () => {
      const { settings } = await chrome.storage.sync.get(["settings"])
      setEnabled(settings?.selectionToolbar !== false)
    }
    checkSetting()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.settings) setEnabled(changes.settings.newValue?.selectionToolbar !== false)
    }
    chrome.storage.sync.onChanged.addListener(listener)
    return () => chrome.storage.sync.onChanged.removeListener(listener)
  }, [])

  const dismiss = useCallback(() => {
    setToolbar((t) => ({ ...t, visible: false }))
    setResult({ visible: false, loading: false, content: "", type: "" })
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleMouseUp = (e: MouseEvent) => {
      // Ignore clicks inside our own toolbar
      if (toolbarRef.current?.contains(e.target as Node)) return

      setTimeout(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim() ?? ""
        if (text.length < 20) {
          dismiss()
          return
        }
        // Don't show on inputs/contenteditable
        const focused = document.activeElement
        if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA" || (focused as HTMLElement).isContentEditable)) {
          dismiss()
          return
        }
        const range = selection?.getRangeAt(0)
        if (!range) { dismiss(); return }
        const rect = range.getBoundingClientRect()
        const x = Math.min(rect.left + window.scrollX, window.innerWidth - 300)
        const y = rect.top + window.scrollY - 48
        setToolbar({ visible: true, x, y: Math.max(y, window.scrollY + 8), text })
        setResult({ visible: false, loading: false, content: "", type: "" })
      }, 10)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) {
        dismiss()
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleMouseDown)
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleMouseDown)
    }
  }, [enabled, dismiss])

  const handleAction = async (type: AnalyzeType | "improve" | "ask") => {
    if (type === "ask") {
      // Trigger the AI overlay with this text as prompt
      chrome.runtime.sendMessage({ type: "ERAL_ASK", text: toolbar.text })
      dismiss()
      return
    }

    const token = await getAccessToken()
    if (!token) {
      setResult({ visible: true, loading: false, content: "Sign in to use Nikita AI features.", type })
      return
    }

    setResult({ visible: true, loading: true, content: "", type })
    const sharedOptions = {
      pageUrl: location.href,
      pageTitle: document.title,
      capabilities: ["selection-actions"],
    }
    const content = type === "improve"
      ? (await eralGenerate("improve", toolbar.text, sharedOptions))?.content
      : (await eralAnalyze(type, toolbar.text, sharedOptions))?.result
    setResult({
      visible: true,
      loading: false,
      content: content ?? "Something went wrong. Please try again.",
      type,
    })
  }

  const actions: { label: string; type: AnalyzeType | "improve" | "ask"; title: string }[] = [
    { label: "Explain", type: "explain", title: "Explain this text" },
    { label: "Summarize", type: "summarize", title: "Summarize this text" },
    { label: "Improve", type: "improve", title: "Improve this text" },
    { label: "Ask", type: "ask", title: "Ask Nikita about this" },
  ]

  if (!enabled || !toolbar.visible) return null

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "absolute",
        left: `${toolbar.x}px`,
        top: `${toolbar.y}px`,
        zIndex: 2147483645,
        fontFamily: FONT,
        userSelect: "none",
      }}
    >
      {/* Toolbar buttons */}
      <div style={{
        display: "flex", alignItems: "center", gap: "2px",
        background: "#09090b", border: "1px solid #3f3f46",
        borderRadius: "8px", padding: "4px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}>
        <span style={{ color: VIOLET, fontSize: "12px", padding: "2px 6px", fontWeight: 700 }}>✦</span>
        {actions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleAction(action.type)}
            title={action.title}
            style={{
              background: "none", border: "none", borderRadius: "5px",
              color: "#d4d4d8", fontSize: "12px", fontWeight: 500,
              padding: "3px 8px", cursor: "pointer",
              transition: "background 0.1s, color 0.1s",
              fontFamily: FONT,
            }}
            onMouseEnter={(e) => {
              ;(e.target as HTMLButtonElement).style.background = VIOLET
              ;(e.target as HTMLButtonElement).style.color = "white"
            }}
            onMouseLeave={(e) => {
              ;(e.target as HTMLButtonElement).style.background = "none"
              ;(e.target as HTMLButtonElement).style.color = "#d4d4d8"
            }}
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={dismiss}
          style={{
            background: "none", border: "none", color: "#52525b", cursor: "pointer",
            fontSize: "14px", padding: "2px 5px", lineHeight: 1, borderRadius: "4px",
            fontFamily: FONT,
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Result panel */}
      {result.visible && (
        <div style={{
          marginTop: "6px",
          background: "#09090b", border: "1px solid #3f3f46",
          borderRadius: "8px", padding: "12px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          maxWidth: "380px", minWidth: "260px",
        }}>
          {result.loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#71717a", fontSize: "12px" }}>
              <span style={{ color: VIOLET }}>✦</span>
              <span>Thinking…</span>
            </div>
          ) : (
            <>
              <div style={{
                color: "#e4e4e7", fontSize: "12px", lineHeight: 1.65,
                whiteSpace: "pre-wrap", maxHeight: "200px", overflowY: "auto",
              }}>
                {result.content}
              </div>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#52525b", fontSize: "11px" }}>Nikita · {result.type}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.content)}
                    style={{ background: "none", border: "1px solid #27272a", borderRadius: "4px", color: "#a1a1aa", fontSize: "11px", padding: "2px 8px", cursor: "pointer", fontFamily: FONT }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={dismiss}
                    style={{ background: "none", border: "1px solid #27272a", borderRadius: "4px", color: "#a1a1aa", fontSize: "11px", padding: "2px 8px", cursor: "pointer", fontFamily: FONT }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EralSelectionToolbar
