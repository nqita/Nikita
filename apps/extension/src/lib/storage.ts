/**
 * Nikita extension storage utilities
 * Uses chrome.storage.session for sensitive data (tokens)
 * Uses chrome.storage.local for persisted preferences and clip history
 * Uses chrome.storage.sync for cross-device settings
 */

export interface Clip {
  id: string
  type: "text" | "link" | "image" | "social" | "page"
  content: string
  sourceUrl: string
  title?: string
  createdAt: string
  synced: boolean
}

export interface EralSettings {
  showAIButton: boolean
  showSaveButtons: boolean
  enableContextMenu: boolean
  downloadFormat: "mp4" | "mp3" | "wav"
  theme: "dark" | "system"
  selectionToolbar: boolean
  pageContextInChat: boolean
}

export const DEFAULT_SETTINGS: EralSettings = {
  showAIButton: true,
  showSaveButtons: true,
  enableContextMenu: true,
  downloadFormat: "mp4",
  theme: "dark",
  selectionToolbar: true,
  pageContextInChat: true,
}

// Session storage (cleared when browser closes)
export const sessionStorage = {
  async getTokens(): Promise<{ accessToken?: string; refreshToken?: string }> {
    return chrome.storage.session.get(["accessToken", "refreshToken"])
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    return chrome.storage.session.set({ accessToken, refreshToken })
  },
  async clearTokens(): Promise<void> {
    return chrome.storage.session.remove(["accessToken", "refreshToken"])
  },
  async getUser(): Promise<{ displayName: string; email: string; avatarUrl: string | null } | null> {
    const { user } = await chrome.storage.session.get(["user"])
    return user ?? null
  },
  async setUser(user: { displayName: string; email: string; avatarUrl: string | null }): Promise<void> {
    return chrome.storage.session.set({ user })
  },
}

// Local storage (persisted, device-only)
export const localStore = {
  async getClips(): Promise<Clip[]> {
    const { clips } = await chrome.storage.local.get(["clips"])
    return clips ?? []
  },
  async addClip(clip: Omit<Clip, "id" | "createdAt" | "synced">): Promise<Clip> {
    const newClip: Clip = {
      ...clip,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      synced: false,
    }
    const clips = await localStore.getClips()
    // Keep last 500 clips
    const updated = [newClip, ...clips].slice(0, 500)
    await chrome.storage.local.set({ clips: updated })
    return newClip
  },
  async clearClips(): Promise<void> {
    return chrome.storage.local.set({ clips: [] })
  },
}

// Sync storage (cross-device settings)
export const syncStore = {
  async getSettings(): Promise<EralSettings> {
    const { settings } = await chrome.storage.sync.get(["settings"])
    return { ...DEFAULT_SETTINGS, ...settings }
  },
  async updateSettings(partial: Partial<EralSettings>): Promise<void> {
    const current = await syncStore.getSettings()
    return chrome.storage.sync.set({ settings: { ...current, ...partial } })
  },
}
