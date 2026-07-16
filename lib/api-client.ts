export type ApiRequestOptions = RequestInit & {
  retries?: number
  retryBaseDelayMs?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

const RETRYABLE_STATUS_CODES = new Set([408, 429])

const shouldRetryStatus = (status: number) =>
  RETRYABLE_STATUS_CODES.has(status) || status >= 500

const sleep = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration))

const readResponsePayload = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => undefined)
  }
  return response.text().catch(() => undefined)
}

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === "string" && payload.trim()) return payload
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error
    if (typeof error === "string" && error.trim()) return error
  }
  return fallback
}

export async function apiFetch<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    retries = 0,
    retryBaseDelayMs = 500,
    headers,
    ...requestOptions
  } = options

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        ...requestOptions,
        headers,
      })
      const payload = await readResponsePayload(response)

      if (response.ok) return payload as T

      if (attempt < retries && shouldRetryStatus(response.status)) {
        await sleep(retryBaseDelayMs * 2 ** attempt)
        continue
      }

      throw new ApiError(
        response.status,
        getErrorMessage(payload, `Request failed (${response.status})`),
        payload,
      )
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (attempt < retries) {
        await sleep(retryBaseDelayMs * 2 ** attempt)
        continue
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Network request failed",
        error,
      )
    }
  }

  throw new ApiError(0, "Maximum retry attempts exceeded")
}

export function apiJsonOptions(
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
  options: Omit<ApiRequestOptions, "method" | "body"> = {},
): ApiRequestOptions {
  return {
    ...options,
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  }
}
