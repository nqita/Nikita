import { useEffect, useState } from "react"

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

type Status = "idle" | "loading" | "queued" | "done" | "error"

export function MediaDownloader() {
  const [url, setUrl] = useState("")
  const [format, setFormat] = useState<"mp4" | "mp3" | "wav">("mp4")
  const [status, setStatus] = useState<Status>("idle")
  const [statusMsg, setStatusMsg] = useState("")

  // Load saved format preference
  useEffect(() => {
    chrome.storage.sync.get(["settings"]).then(({ settings }) => {
      if (settings?.downloadFormat) setFormat(settings.downloadFormat)
    })
  }, [])

  const reset = () => {
    setStatus("idle")
    setStatusMsg("")
  }

  const handleDownload = async () => {
    if (!url) return
    setStatus("loading")
    setStatusMsg("")

    try {
      const { accessToken } = await chrome.storage.session.get(["accessToken"])
      if (!accessToken) {
        setStatus("error")
        setStatusMsg("Sign in to use the media downloader")
        return
      }

      const res = await fetch(`${API_URL}/v1/media/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ url, format }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setStatusMsg(data.error || "Download failed")
        return
      }

      const downloadUrl: string | undefined = data.downloadUrl ?? data.data?.downloadUrl
      const jobId: string | undefined = data.jobId ?? data.data?.jobId

      if (downloadUrl) {
        chrome.downloads.download({ url: downloadUrl })
        setStatus("done")
        setStatusMsg("Download started!")
        setUrl("")
      } else if (jobId) {
        setStatus("queued")
        setStatusMsg("Processing… download will start automatically")
        setUrl("")
        pollJob(jobId, accessToken)
      } else {
        setStatus("error")
        setStatusMsg("Unexpected response from server")
      }
    } catch {
      setStatus("error")
      setStatusMsg("Network error — check your connection")
    }
  }

  const pollJob = async (jobId: string, token: string) => {
    let attempts = 0
    const poll = async () => {
      attempts++
      if (attempts > 60) {
        setStatus("error")
        setStatusMsg("Download timed out — try again")
        return
      }
      try {
        const res = await fetch(`${API_URL}/v1/media/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const job = data.data ?? data
        if (job.status === "completed" && job.downloadUrl) {
          chrome.downloads.download({ url: job.downloadUrl })
          setStatus("done")
          setStatusMsg("Download started!")
        } else if (job.status === "failed") {
          setStatus("error")
          setStatusMsg(job.error || "Processing failed")
        } else {
          setTimeout(poll, 3000)
        }
      } catch {
        setTimeout(poll, 5000)
      }
    }
    setTimeout(poll, 3000)
  }

  const isbusy = status === "loading" || status === "queued"

  return (
    <div className="space-y-3 pb-1">
      <input
        value={url}
        onChange={(e) => { setUrl(e.target.value); if (status !== "idle") reset() }}
        onKeyDown={(e) => e.key === "Enter" && handleDownload()}
        placeholder="YouTube, Instagram, TikTok, X…"
        className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b] focus:border-[#3b82f6] focus:outline-none"
      />

      <div className="flex gap-2">
        {(["mp4", "mp3", "wav"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              format === f ? "bg-[#3b82f6] text-white" : "border border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:bg-[#27272a]"
            }`}
          >
            .{f}
          </button>
        ))}
      </div>

      {statusMsg && (
        <p className={`text-xs ${status === "error" ? "text-[#ef4444]" : status === "done" ? "text-[#22c55e]" : "text-[#a1a1aa]"}`}>
          {status === "queued" && <span className="inline-block mr-1 animate-spin">⟳</span>}
          {statusMsg}
        </p>
      )}

      <button
        onClick={handleDownload}
        disabled={!url || isbusy}
        className="w-full rounded-lg bg-[#3b82f6] py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Submitting…" : status === "queued" ? "Processing…" : "Download"}
      </button>
    </div>
  )
}

