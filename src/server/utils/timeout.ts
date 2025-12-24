import "server-only"

/**
 * Utility functions for fetch timeouts and retries.
 */

export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  // Store timeoutId on controller for cleanup if needed
  ;(controller as any)._timeoutId = timeoutId
  
  return controller.signal
}

export function clearTimeoutSignal(signal: AbortSignal): void {
  const controller = (signal as any)._controller as AbortController | undefined
  const timeoutId = (signal as any)._timeoutId as NodeJS.Timeout | undefined
  
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options
  const signal = createTimeoutSignal(timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal,
    })
    clearTimeoutSignal(signal)
    return response
  } catch (error) {
    clearTimeoutSignal(signal)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number; maxRetries?: number; backoffMs?: number } = {}
): Promise<Response> {
  const { maxRetries = 0, backoffMs = 500, ...fetchOptions } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, fetchOptions)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)))
        continue
      }
    }
  }
  
  throw lastError || new Error("Unknown error in fetchWithRetry")
}

