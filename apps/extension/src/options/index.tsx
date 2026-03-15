import { useEffect, useState } from "react"
import "./style.css"
import { syncStore, type EralSettings, DEFAULT_SETTINGS } from "@/lib/storage"

const VERSION = chrome.runtime.getManifest().version

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[#3b82f6]" : "bg-[#3f3f46]"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
    </button>
  )
}

function OptionsPage() {
  const [settings, setSettings] = useState<EralSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [apiUrl, setApiUrl] = useState("")
  const [apiUrlSaved, setApiUrlSaved] = useState(false)

  useEffect(() => {
    syncStore.getSettings().then(setSettings)
    chrome.storage.sync.get(["apiUrl"]).then(({ apiUrl }) => setApiUrl(apiUrl ?? ""))
  }, [])

  const updateSetting = async <K extends keyof EralSettings>(key: K, value: EralSettings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    await syncStore.updateSettings({ [key]: value })
    // Notify content scripts of settings change
    chrome.runtime.sendMessage({ type: "UPDATE_CONTEXT_MENUS", enabled: key === "enableContextMenu" ? value : settings.enableContextMenu })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveApiUrl = async () => {
    await chrome.storage.sync.set({ apiUrl: apiUrl.trim() || null })
    setApiUrlSaved(true)
    setTimeout(() => setApiUrlSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#3b82f6] flex items-center justify-center text-xl">✦</div>
          <div>
            <h1 className="text-xl font-bold">Nikita Settings</h1>
            <p className="text-xs text-[#71717a]">v{VERSION}</p>
          </div>
          {saved && (
            <span className="ml-auto text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2 py-1 rounded-md">
              ✓ Saved
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* AI Overlay */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">AI</p>
            </div>
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm">Show AI button on pages</p>
                <p className="text-xs text-[#71717a] mt-0.5">Floating ✦ button to open Nikita AI assistant</p>
              </div>
              <Toggle checked={settings.showAIButton} onChange={(v) => updateSetting("showAIButton", v)} />
            </label>
          </div>

          {/* Social Saver */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">Social Media</p>
            </div>
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm">Save buttons on posts</p>
                <p className="text-xs text-[#71717a] mt-0.5">Twitter / X, Reddit, Instagram</p>
              </div>
              <Toggle checked={settings.showSaveButtons} onChange={(v) => updateSetting("showSaveButtons", v)} />
            </label>
          </div>

          {/* Context Menu */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">Context Menu</p>
            </div>
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm">Right-click menu items</p>
                <p className="text-xs text-[#71717a] mt-0.5">Clip selection, save links and images</p>
              </div>
              <Toggle checked={settings.enableContextMenu} onChange={(v) => updateSetting("enableContextMenu", v)} />
            </label>
          </div>

          {/* Download Format */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">Media Downloads</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm mb-3">Default format</p>
              <div className="flex gap-2">
                {(["mp4", "mp3", "wav"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => updateSetting("downloadFormat", f)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                      settings.downloadFormat === f
                        ? "bg-[#3b82f6] text-white"
                        : "border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a]"
                    }`}
                  >
                    .{f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keyboard shortcut */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-3">
            <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest mb-3">Keyboard Shortcut</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#a1a1aa]">Clip current page</p>
              <div className="flex gap-1 text-xs">
                <kbd className="px-2 py-0.5 rounded border border-[#3f3f46] bg-[#27272a] font-mono">Ctrl</kbd>
                <kbd className="px-2 py-0.5 rounded border border-[#3f3f46] bg-[#27272a] font-mono">Shift</kbd>
                <kbd className="px-2 py-0.5 rounded border border-[#3f3f46] bg-[#27272a] font-mono">Y</kbd>
              </div>
            </div>
            <p className="text-xs text-[#52525b] mt-1">Change in browser → Extensions → Keyboard shortcuts</p>
          </div>

          {/* Self-hosting / API URL override */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">Advanced</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm">Custom API URL</p>
              <p className="text-xs text-[#71717a]">For self-hosted WokAPI instances. Leave blank to use the default.</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="flex-1 rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:border-[#3b82f6] focus:outline-none"
                />
                <button
                  onClick={saveApiUrl}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    apiUrlSaved ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#27272a] text-[#fafafa] hover:bg-[#3f3f46]"
                  }`}
                >
                  {apiUrlSaved ? "✓" : "Save"}
                </button>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] divide-y divide-[#27272a]">
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-[#71717a] uppercase tracking-widest">About</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#a1a1aa]">Version</span>
                <span className="font-mono text-xs text-[#71717a]">{VERSION}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "Dashboard", href: "https://wokspec.org/dashboard" },
                  { label: "GitHub", href: "https://github.com/wokspec/nikita" },
                  { label: "Changelog", href: "https://wokspec.org/changelog" },
                  { label: "Privacy", href: "https://wokspec.org/privacy" },
                  { label: "Report a bug", href: "https://github.com/wokspec/nikita/issues/new" },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3b82f6] hover:underline"
                  >
                    {label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OptionsPage
