const AUTH_TOKEN_STORAGE_KEY = "tangerine-auth-token"
const AUTH_FAILURE_EVENT = "tangerine-auth-failure"

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export function buildAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  const token = getAuthToken()
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return headers
}

export function emitAuthFailure(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_FAILURE_EVENT))
}

export function subscribeAuthFailure(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(AUTH_FAILURE_EVENT, handler)
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, handler)
}
