import "server-only"

import { env } from "@/lib/env"

// Talks to the API over HTTP: base URL, auth header, timeout, and the
// { error: { code, message } } envelope. Every endpoint module in this
// directory calls apiFetch — nothing outside src/lib/api/ calls fetch
// against the API directly. See SDG-213.

const TIMEOUT_MS = 5000

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, options: { status: number; code: string; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = "ApiError"
    this.status = options.status
    this.code = options.code
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.API_BASE_URL}${path}`
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${env.API_TOKEN}`)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      // Explicit rather than relying on the framework default, which has
      // moved across Next majors and will again.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    // Covers both a refused/failed connection and an aborted-by-timeout
    // fetch — bun rejects each with a different error shape (a plain Error
    // with code "ConnectionRefused", vs a DOMException named "TimeoutError"),
    // neither of which is an ApiError, so one catch maps both.
    throw new ApiError(`Could not reach the API at ${url}`, {
      status: 0,
      code: "API_UNREACHABLE",
      cause,
    })
  }

  if (!response.ok) throw await toHttpError(response)

  return (await response.json()) as T
}

async function toHttpError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => undefined)
  if (isErrorEnvelope(body)) {
    return new ApiError(body.error.message, { status: response.status, code: body.error.code })
  }
  return new ApiError(response.statusText || `HTTP ${response.status}`, {
    status: response.status,
    code: "HTTP_ERROR",
  })
}

function isErrorEnvelope(value: unknown): value is { error: { code: string; message: string } } {
  if (typeof value !== "object" || value === null) return false
  const error = (value as { error?: unknown }).error
  if (typeof error !== "object" || error === null) return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  return typeof code === "string" && typeof message === "string"
}
