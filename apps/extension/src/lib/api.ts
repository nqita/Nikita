/**
 * Authenticated API client for the Nikita extension.
 * Automatically refreshes the access token on 401 and retries the request once.
 * Falls back to signed-out state if refresh fails.
 */

const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

export { API_URL }

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token on success, null on failure.
 */
async function tryRefresh(): Promise<string | null> {
  const { refreshToken } = await chrome.storage.session.get(["refreshToken"])
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      await chrome.storage.session.clear()
      return null
    }
    const data = await res.json()
    const { accessToken, refreshToken: newRefresh } = data.data ?? {}
    if (!accessToken) {
      await chrome.storage.session.clear()
      return null
    }
    await chrome.storage.session.set({ accessToken, refreshToken: newRefresh ?? refreshToken })
    return accessToken as string
  } catch {
    return null
  }
}

/**
 * fetch() wrapper that injects the Bearer token and retries once on 401.
 * Suitable for use in the background service worker.
 */
export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const { accessToken } = await chrome.storage.session.get(["accessToken"])
  if (!accessToken) return null

  const doFetch = (token: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
        Authorization: `Bearer ${token}`,
      },
    })

  const res = await doFetch(accessToken)

  if (res.status !== 401) return res

  // Token expired — try to refresh
  const newToken = await tryRefresh()
  if (!newToken) return null  // signed out

  return doFetch(newToken)
}
