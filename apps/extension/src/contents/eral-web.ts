import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
}

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

// ── Message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "CLIP_SELECTION": {
      const selection = window.getSelection()?.toString() || message.text
      if (selection) {
        sendClip({ type: "text", content: selection, sourceUrl: window.location.href })
        showToast("Saved to Nikita!")
      }
      sendResponse({ success: true })
      break
    }
    case "SAVE_LINK": {
      sendClip({ type: "link", content: message.linkUrl, sourceUrl: message.pageUrl })
      showToast("Link saved!")
      sendResponse({ success: true })
      break
    }
    case "SAVE_IMAGE": {
      sendClip({ type: "image", content: message.srcUrl, sourceUrl: message.pageUrl })
      showToast("Image saved!")
      sendResponse({ success: true })
      break
    }
    case "DOWNLOAD_MEDIA": {
      // Trigger download via background (background has downloads permission)
      chrome.runtime.sendMessage({
        type: "START_MEDIA_DOWNLOAD",
        url: message.srcUrl,
        pageUrl: message.pageUrl,
      })
      showToast("Download queued!")
      sendResponse({ success: true })
      break
    }
    case "GET_PAGE_TEXT": {
      const text = document.body.innerText?.slice(0, 8000) || ""
      sendResponse({ text, title: document.title, url: window.location.href })
      break
    }
  }
  return true
})

// ── Clip helper ─────────────────────────────────────────────────────────────

async function sendClip(clip: { type: string; content: string; sourceUrl: string; title?: string }) {
  const { accessToken } = await chrome.storage.session.get(["accessToken"])
  if (!accessToken) {
    showToast("Sign in to Nikita first", "error")
    return
  }
  try {
    await fetch(`${API_URL}/v1/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(clip),
    })
  } catch {
    showToast("Failed to save — check your connection", "error")
  }
}

// ── Toast ────────────────────────────────────────────────────────────────────

function showToast(message: string, type: "success" | "error" = "success") {
  const existing = document.getElementById("nikita-toast")
  if (existing) existing.remove()

  const toast = document.createElement("div")
  toast.id = "nikita-toast"
  toast.style.cssText = `
    position: fixed;
    bottom: 76px;
    right: 20px;
    z-index: 2147483647;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 500;
    color: #fafafa;
    background: ${type === "error" ? "#450a0a" : "#18181b"};
    border: 1px solid ${type === "error" ? "#ef4444" : "#7c3aed"};
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    pointer-events: none;
    transition: opacity 0.3s;
  `
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = "0"
    setTimeout(() => toast.remove(), 300)
  }, 2700)
}

// ── Social save buttons ──────────────────────────────────────────────────────

const SOCIAL_PATTERNS = [
  { host: "twitter.com", selector: 'article[data-testid="tweet"]' },
  { host: "x.com", selector: 'article[data-testid="tweet"]' },
  { host: "instagram.com", selector: "article" },
  { host: "reddit.com", selector: '[data-testid="post-container"]' },
]

let saveButtonsEnabled = true

async function initSocialButtons() {
  const { settings } = await chrome.storage.sync.get(["settings"])
  saveButtonsEnabled = settings?.showSaveButtons !== false
  if (saveButtonsEnabled) {
    injectSaveButtons()
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

// Listen for settings changes
chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes.settings) {
    const enabled = changes.settings.newValue?.showSaveButtons !== false
    if (enabled !== saveButtonsEnabled) {
      saveButtonsEnabled = enabled
      if (enabled) {
        injectSaveButtons()
        observer.observe(document.body, { childList: true, subtree: true })
      } else {
        observer.disconnect()
        document.querySelectorAll(".nikita-save-btn").forEach((el) => el.remove())
      }
    }
  }
})

function injectSaveButtons() {
  if (!saveButtonsEnabled) return
  const hostname = window.location.hostname.replace("www.", "")
  const pattern = SOCIAL_PATTERNS.find((p) => hostname.includes(p.host))
  if (!pattern) return

  document.querySelectorAll(pattern.selector).forEach((post) => {
    if (post.querySelector(".nikita-save-btn")) return

    const btn = document.createElement("button")
    btn.className = "nikita-save-btn"
    btn.setAttribute("aria-label", "Save to Nikita")
    btn.style.cssText = `
      position: absolute; top: 8px; right: 8px; z-index: 100;
      padding: 4px 10px; border-radius: 6px;
      background: rgba(124,58,237,0.9); color: white;
      font-size: 11px; font-weight: 600; border: none; cursor: pointer;
      font-family: -apple-system, sans-serif; line-height: 1.5;
    `
    btn.textContent = "Save"
    ;(post as HTMLElement).style.position = "relative"
    post.appendChild(btn)

    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      const text = post.textContent?.slice(0, 500) ?? ""
      sendClip({ type: "social", content: text, sourceUrl: window.location.href })
      btn.textContent = "✓ Saved"
      setTimeout(() => { btn.textContent = "Save" }, 2000)
    })
  })
}

const observer = new MutationObserver(injectSaveButtons)
initSocialButtons()

export {}

