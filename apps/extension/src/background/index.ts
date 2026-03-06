import { reportError } from "@/lib/errors"
import { fetchWithAuth, API_URL } from "@/lib/api"
import { eralAnalyze } from "@/lib/eral"

const SITE_URL = process.env.PLASMO_PUBLIC_SITE_URL ?? "https://wokspec.org"

// ── Error reporting ────────────────────────────────────────────────────────

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const err = event.reason
  reportError(
    err?.message ?? String(err),
    err?.stack ?? undefined,
    "background"
  )
})

// ── Context menu setup ─────────────────────────────────────────────────────

async function setupContextMenus() {
  const { settings } = await chrome.storage.sync.get(["settings"])
  if (settings?.enableContextMenu === false) return

  chrome.contextMenus.removeAll(() => {
    const { lastError } = chrome.runtime
    if (lastError) return

    chrome.contextMenus.create({ id: "eral-ask-selection", title: "Ask Eral about this", contexts: ["selection"] })
    chrome.contextMenus.create({ id: "eral-explain-selection", title: "Explain with Eral", contexts: ["selection"] })
    chrome.contextMenus.create({ id: "eral-clip-text", title: "Save to Eral", contexts: ["selection"] })
    chrome.contextMenus.create({ id: "eral-save-image", title: "Save image with Eral", contexts: ["image"] })
    chrome.contextMenus.create({ id: "eral-save-link", title: "Save link with Eral", contexts: ["link"] })
    chrome.contextMenus.create({ id: "eral-download-media", title: "Download with Eral", contexts: ["video", "audio"] })
  })
}

chrome.runtime.onInstalled.addListener((details) => {
  setupContextMenus()
  // Open welcome tab on first install
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/welcome.html") })
  }
})
chrome.runtime.onStartup.addListener(setupContextMenus)

// ── Context menu click ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  switch (info.menuItemId) {
    case "eral-ask-selection":
      chrome.tabs.sendMessage(tab.id, { type: "ERAL_ASK", text: info.selectionText })
      break
    case "eral-explain-selection":
      chrome.tabs.sendMessage(tab.id, { type: "ERAL_EXPLAIN", text: info.selectionText })
      break
    case "eral-clip-text":
      chrome.tabs.sendMessage(tab.id, { type: "CLIP_SELECTION", text: info.selectionText, pageUrl: info.pageUrl })
      break
    case "eral-save-image":
      chrome.tabs.sendMessage(tab.id, { type: "SAVE_IMAGE", srcUrl: info.srcUrl, pageUrl: info.pageUrl })
      break
    case "eral-save-link":
      chrome.tabs.sendMessage(tab.id, { type: "SAVE_LINK", linkUrl: info.linkUrl, pageUrl: info.pageUrl })
      break
    case "eral-download-media":
      chrome.tabs.sendMessage(tab.id, { type: "DOWNLOAD_MEDIA", srcUrl: info.srcUrl, pageUrl: info.pageUrl })
      break
  }
})

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "clip-current-page") {
    chrome.runtime.sendMessage({ type: "CLIP_CURRENT_PAGE" })
  } else if (command === "summarize-page") {
    chrome.runtime.sendMessage({ type: "SUMMARIZE_PAGE" })
  }
})

// ── OAuth callback detection ───────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return
  const url = new URL(tab.url)

  // Detect auth callback: wokspec.org/auth/callback?accessToken=...
  if (
    (url.hostname === "wokspec.org" || url.hostname.endsWith(".wokspec.org")) &&
    url.pathname === "/auth/callback" &&
    url.searchParams.has("accessToken")
  ) {
    const accessToken = url.searchParams.get("accessToken")!
    const refreshToken = url.searchParams.get("refreshToken") ?? ""

    await chrome.storage.session.set({ accessToken, refreshToken })

    // Fetch user info
    try {
      const res = await fetch(`${API_URL}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        await chrome.storage.session.set({ user: data.data ?? data })
      }
    } catch {}

    // Close the auth tab and open popup
    chrome.tabs.remove(tabId)
    chrome.action.openPopup?.().catch(() => {})
  }
})

// ── Media job polling ─────────────────────────────────────────────────────
// Tracks active jobs: { [alarmName]: { jobId, downloadUrl? } }

async function pollMediaJob(alarmName: string) {
  const { pendingJobs = {} } = await chrome.storage.local.get(["pendingJobs"])
  const job = pendingJobs[alarmName]
  if (!job) return

  try {
    const res = await fetchWithAuth(`/v1/media/jobs/${job.jobId}`)
    if (!res) {
      // Signed out — clean up
      delete pendingJobs[alarmName]
      await chrome.storage.local.set({ pendingJobs })
      chrome.alarms.clear(alarmName)
      return
    }
    if (!res.ok) return
    const data = await res.json()
    const status = data.data?.status

    if (status === "completed") {
      chrome.notifications.create(alarmName, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon48.png"),
        title: "Download ready!",
        message: "Your media download has finished. Click to open.",
      })
      pendingJobs[alarmName] = { ...job, downloadUrl: data.data.downloadUrl, done: true }
      await chrome.storage.local.set({ pendingJobs })
      chrome.alarms.clear(alarmName)
    } else if (status === "failed") {
      chrome.notifications.create(alarmName, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon48.png"),
        title: "Download failed",
        message: data.data?.error ?? "Something went wrong with your media download.",
      })
      delete pendingJobs[alarmName]
      await chrome.storage.local.set({ pendingJobs })
      chrome.alarms.clear(alarmName)
    }
  } catch {}
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const { pendingJobs = {} } = await chrome.storage.local.get(["pendingJobs"])
  const job = pendingJobs[notificationId]
  if (job?.downloadUrl) {
    chrome.tabs.create({ url: job.downloadUrl })
    delete pendingJobs[notificationId]
    await chrome.storage.local.set({ pendingJobs })
  }
  chrome.notifications.clear(notificationId)
})

// ── Message handlers ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "GET_AUTH_STATUS": {
      chrome.storage.session.get(["accessToken", "user"]).then(({ accessToken, user }) => {
        sendResponse({ authenticated: !!accessToken, user: user ?? null })
      })
      return true
    }

    case "CLIP_CURRENT_PAGE": {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.id || !tab.url) { sendResponse({ success: false }); return }
        // Can't inject into restricted pages
        if (/^(chrome|edge|about|moz-extension|chrome-extension):/.test(tab.url)) {
          sendResponse({ success: false, error: "restricted_page" }); return
        }
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_TEXT" })
          const apiRes = await fetchWithAuth("/v1/clips", {
            method: "POST",
            body: JSON.stringify({ type: "page", content: res.text || tab.url, title: res.title ?? tab.title, sourceUrl: res.url ?? tab.url }),
          })
          sendResponse({ success: apiRes !== null && apiRes.ok })
        } catch {
          sendResponse({ success: false })
        }
      })
      return true
    }

    case "SAVE_CURRENT_URL": {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.url) { sendResponse({ success: false }); return }
        if (/^(chrome|edge|about|moz-extension|chrome-extension):/.test(tab.url)) {
          sendResponse({ success: false, error: "restricted_page" }); return
        }
        try {
          const apiRes = await fetchWithAuth("/v1/clips", {
            method: "POST",
            body: JSON.stringify({ type: "link", content: tab.url, title: tab.title, sourceUrl: tab.url }),
          })
          sendResponse({ success: apiRes !== null && apiRes.ok })
        } catch {
          sendResponse({ success: false })
        }
      })
      return true
    }

    case "START_MEDIA_DOWNLOAD": {
      ;(async () => {
        try {
          const res = await fetchWithAuth("/v1/media/download", {
            method: "POST",
            body: JSON.stringify({ url: message.url, format: message.format ?? "mp4" }),
          })
          if (!res) { sendResponse({ success: false, error: "not_authenticated" }); return }
          const data = await res.json()
          const jobId = data.data?.jobId
          if (res.ok && jobId) {
            const alarmName = `media-poll-${jobId}`
            const { pendingJobs = {} } = await chrome.storage.local.get(["pendingJobs"])
            pendingJobs[alarmName] = { jobId }
            await chrome.storage.local.set({ pendingJobs })
            chrome.alarms.create(alarmName, { periodInMinutes: 0.5 })
          }
          sendResponse({ success: res.ok, jobId })
        } catch {
          sendResponse({ success: false })
        }
      })()
      return true
    }

    case "UPDATE_CONTEXT_MENUS": {
      if (message.enabled) {
        setupContextMenus()
      } else {
        chrome.contextMenus.removeAll()
      }
      sendResponse({ success: true })
      break
    }

    case "SUMMARIZE_PAGE": {
      ;(async () => {
        try {
          let content: string = (message as { content?: string }).content ?? ""
          const isVideo: boolean = !!(message as { isVideo?: boolean }).isVideo
          if (!content) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (!tab?.id || !tab.url) { sendResponse({ success: false }); return }
            if (/^(chrome|edge|about|moz-extension|chrome-extension):/.test(tab.url)) {
              sendResponse({ success: false, error: "restricted_page" }); return
            }
            const [{ result }] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.title + "\n\n" + document.body.innerText.slice(0, 8000),
            })
            content = result as string
          }
          const { accessToken } = await chrome.storage.session.get(["accessToken"])
          if (!accessToken) { sendResponse({ success: false, error: "not_authenticated" }); return }
          const summary = await eralAnalyze("summarize", content, {
            pageTitle: (message as { title?: string }).title,
            context: isVideo ? "This content comes from a video page." : undefined,
            systemHint: isVideo
              ? "You are summarizing a video. Focus on the key topics, claims, and takeaways."
              : undefined,
            capabilities: ["video-summary"],
          })
          if (!summary) { sendResponse({ success: false }); return }
          sendResponse({ success: true, summary: summary.result })
        } catch {
          sendResponse({ success: false })
        }
      })()
      return true
    }
  }
})

// ── Alarm dispatcher ───────────────────────────────────────────────────────

// Only create the alarm if it doesn't already exist (service workers restart frequently)
chrome.alarms.get("token-refresh").then((existing) => {
  if (!existing) chrome.alarms.create("token-refresh", { periodInMinutes: 14 })
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "token-refresh") {
    const { refreshToken } = await chrome.storage.session.get(["refreshToken"])
    if (!refreshToken) return
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.ok) {
        const data = await res.json()
        await chrome.storage.session.set({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken ?? refreshToken,
        })
      } else if (res.status === 401) {
        // Refresh token invalid/expired — sign out
        await chrome.storage.session.clear()
      }
    } catch {}
  } else if (alarm.name.startsWith("media-poll-")) {
    await pollMediaJob(alarm.name)
  }
})

export {}
