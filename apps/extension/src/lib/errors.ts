const API_URL = process.env.PLASMO_PUBLIC_API_URL ?? "https://api.wokspec.org"

export async function reportError(
  message: string,
  stack?: string,
  url?: string
): Promise<void> {
  try {
    const { accessToken } = await chrome.storage.session.get(["accessToken"])
    await fetch(`${API_URL}/v1/errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ message, stack, url, platform: "nikita-extension" }),
    })
  } catch {
    // Never throw from error reporter
  }
}
