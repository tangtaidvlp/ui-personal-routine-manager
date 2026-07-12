/**
 * Lightweight fetch wrapper for the Routine Manager backend.
 *
 * All requests are sent with credentials so the refresh-token cookie is
 * included, and JSON bodies are encoded/decoded automatically. Non-2xx
 * responses are surfaced as `ApiError` so callers can branch on `status`
 * and show `message`.
 */

// Base URL for the API. Defaults to the versioned path served behind the
// dev proxy / same origin; override with VITE_API_BASE_URL in production.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/** Error thrown for any non-2xx response, carrying the HTTP status and body. */
export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Plain object serialized as a JSON body (sets Content-Type for you). */
  json?: unknown
  /** Bearer token attached as the Authorization header. */
  token?: string | null
}

/**
 * Perform an API request and return the parsed JSON body.
 *
 * @throws {ApiError} when the response status is not in the 2xx range.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json, token, headers, ...init } = options

  const finalHeaders = new Headers(headers)
  if (json !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : (init as RequestInit).body,
    })
  } catch {
    throw new ApiError(0, 'A network error occurred. Please try again later.')
  }

  // Attempt to parse a JSON body; tolerate empty / non-JSON responses.
  const contentType = res.headers.get('Content-Type') ?? ''
  const body = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : null

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : null) ?? `Request failed with status ${res.status}`
    throw new ApiError(res.status, message, body)
  }

  return body as T
}
