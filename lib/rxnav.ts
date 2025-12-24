/**
 * RxNav/RxTerms API helper functions.
 * Server-only module for fetching medication autocomplete data.
 */

const RXTERMS_BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search'
const REQUEST_TIMEOUT_MS = 5000

/**
 * Autocomplete result item with display and normalized value.
 */
export interface RxTermsAutocompleteResult {
  display: string
  value: string
}

/**
 * Normalizes a medication name string for matching.
 * 
 * @param display - The original display string from RxTerms
 * @returns Normalized value: lowercase, trimmed, parenthetical removed, spaces collapsed
 */
function normalizeMedicationName(display: string): string {
  // Trim whitespace
  let normalized = display.trim()
  
  // Convert to lowercase
  normalized = normalized.toLowerCase()
  
  // Remove trailing parenthetical portion (e.g., " (Oral Pill)")
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '')
  
  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ')
  
  // Trim again after processing
  return normalized.trim()
}

/**
 * Fetches autocomplete suggestions from RxTerms API.
 * 
 * @param query - Search query string (should be validated before calling)
 * @returns Array of autocomplete result objects with display and normalized value
 */
export async function fetchRxTermsAutocomplete(query: string): Promise<RxTermsAutocompleteResult[]> {
  const url = `${RXTERMS_BASE_URL}?terms=${encodeURIComponent(query)}`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Return empty array on HTTP errors (don't throw to keep autocomplete resilient)
      return []
    }

    const data = await response.json()
    
    // RxTerms API returns: [count, [medication names], {additional info}]
    // Extract the medication names array (index 1)
    if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
      return data[1].map((display: string) => ({
        display,
        value: normalizeMedicationName(display),
      }))
    }

    return []
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle abort (timeout) or network errors
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout - return empty array to keep autocomplete resilient
      return []
    }
    
    // For other errors, return empty array rather than throwing
    return []
  }
}

