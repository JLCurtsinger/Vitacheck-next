import "server-only"
import { fetchWithRetry } from "../utils/timeout"
import { TIMEOUT_FDA_LABEL, FDA_LABEL_MAX_RETRIES, FDA_LABEL_RETRY_BACKOFF_MS } from "../constants"
import type { ProviderResponse, FdaLabelResult } from "../types"

const OPENFDA_BASE_URL = "https://api.fda.gov/drug/label.json"

/**
 * Fetch drug label warnings from openFDA.
 */
export async function fetchFdaLabel(
  normalizedValue: string,
  rxcui?: string
): Promise<ProviderResponse<FdaLabelResult>> {
  const startTime = Date.now()
  
  try {
    // Strategy 1: If RxCUI available, use exact RxCUI match (most reliable)
    if (rxcui) {
      const url = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(`openfda.rxcui:"${rxcui}"`)}&limit=1`
      
      const response = await fetchWithRetry(url, {
        timeout: TIMEOUT_FDA_LABEL,
        maxRetries: FDA_LABEL_MAX_RETRIES,
        backoffMs: FDA_LABEL_RETRY_BACKOFF_MS,
        headers: {
          Accept: "application/json",
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const result = extractFdaLabelData(data, normalizedValue, true)
        if (result) {
          return {
            data: result,
            cached: false,
            timingMs: Date.now() - startTime,
          }
        }
      }
    }
    
    // Strategy 2: Try exact phrase match on generic_name
    const genericNameUrl = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(`openfda.generic_name:"${normalizedValue}"`)}&limit=5`
    
    const genericResponse = await fetchWithRetry(genericNameUrl, {
      timeout: TIMEOUT_FDA_LABEL,
      maxRetries: FDA_LABEL_MAX_RETRIES,
      backoffMs: FDA_LABEL_RETRY_BACKOFF_MS,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (genericResponse.ok) {
      const data = await genericResponse.json()
      const result = extractFdaLabelDataWithFilter(data, normalizedValue, "generic_name")
      if (result) {
        return {
          data: result,
          cached: false,
          timingMs: Date.now() - startTime,
        }
      }
    }
    
    // Strategy 3: Try exact phrase match on brand_name
    const brandNameUrl = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(`openfda.brand_name:"${normalizedValue}"`)}&limit=5`
    
    const brandResponse = await fetchWithRetry(brandNameUrl, {
      timeout: TIMEOUT_FDA_LABEL,
      maxRetries: FDA_LABEL_MAX_RETRIES,
      backoffMs: FDA_LABEL_RETRY_BACKOFF_MS,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (brandResponse.ok) {
      const data = await brandResponse.json()
      const result = extractFdaLabelDataWithFilter(data, normalizedValue, "brand_name")
      if (result) {
        return {
          data: result,
          cached: false,
          timingMs: Date.now() - startTime,
        }
      }
    }
    
    // Strategy 4: Conservative fallback - search with post-filter
    // Only use if all above strategies fail
    const fallbackUrl = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(`"${normalizedValue}"`)}&limit=10`
    
    const fallbackResponse = await fetchWithRetry(fallbackUrl, {
      timeout: TIMEOUT_FDA_LABEL,
      maxRetries: FDA_LABEL_MAX_RETRIES,
      backoffMs: FDA_LABEL_RETRY_BACKOFF_MS,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (!fallbackResponse.ok) {
      return {
        data: null,
        error: `HTTP ${fallbackResponse.status}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await fallbackResponse.json()
    const result = extractFdaLabelDataWithFilter(data, normalizedValue, "any")
    
    // Only return if we found a confident match
    return {
      data: result || null,
      cached: false,
      timingMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
}

/**
 * Extract FDA label data from response (for RxCUI matches - no filtering needed)
 */
function extractFdaLabelData(data: any, normalizedValue: string, requireMatch: boolean = false): FdaLabelResult | null {
  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    return null
  }
  
  const result = data.results[0]
  return extractWarningsAndMetadata(result, normalizedValue, requireMatch)
}

/**
 * Extract FDA label data with post-filtering to ensure match
 */
function extractFdaLabelDataWithFilter(
  data: any,
  normalizedValue: string,
  fieldType: "generic_name" | "brand_name" | "any"
): FdaLabelResult | null {
  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    return null
  }
  
  const normalizedLower = normalizedValue.toLowerCase()
  
  // Find first result that matches
  for (const result of data.results) {
    let matches = false
    
    if (fieldType === "generic_name" || fieldType === "any") {
      if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
        for (const name of result.openfda.generic_name) {
          if (String(name).toLowerCase().includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
      if (!matches && result.generic_name && Array.isArray(result.generic_name)) {
        for (const name of result.generic_name) {
          if (String(name).toLowerCase().includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
    }
    
    if (!matches && (fieldType === "brand_name" || fieldType === "any")) {
      if (result.openfda?.brand_name && Array.isArray(result.openfda.brand_name)) {
        for (const name of result.openfda.brand_name) {
          if (String(name).toLowerCase().includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
      if (!matches && result.brand_name && Array.isArray(result.brand_name)) {
        for (const name of result.brand_name) {
          if (String(name).toLowerCase().includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
    }
    
    if (!matches && fieldType === "any") {
      // Also check substance_name as fallback
      if (result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
        for (const name of result.openfda.substance_name) {
          if (String(name).toLowerCase().includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
    }
    
    if (matches) {
      return extractWarningsAndMetadata(result, normalizedValue, true)
    }
  }
  
  return null
}

/**
 * Extract warnings and metadata from a single FDA label result
 */
function extractWarningsAndMetadata(result: any, normalizedValue: string, requireMatch: boolean): FdaLabelResult | null {
  let warnings: string[] | undefined
  let productName: string | undefined
  let extractedRxcui: string | undefined
  
  // Extract warnings
  if (result.warnings && Array.isArray(result.warnings)) {
    warnings = result.warnings
  } else if (result.warnings) {
    warnings = [String(result.warnings)]
  }
  
  // Extract product name
  if (result.brand_name && Array.isArray(result.brand_name) && result.brand_name.length > 0) {
    productName = result.brand_name[0]
  } else if (result.generic_name && Array.isArray(result.generic_name) && result.generic_name.length > 0) {
    productName = result.generic_name[0]
  } else if (result.product_name) {
    productName = String(result.product_name)
  }
  
  // Extract RxCUI if available
  if (result.openfda && result.openfda.rxcui && Array.isArray(result.openfda.rxcui) && result.openfda.rxcui.length > 0) {
    extractedRxcui = String(result.openfda.rxcui[0])
  }
  
  // Return null if no data found and match is required
  if (requireMatch && !warnings && !productName && !extractedRxcui) {
    return null
  }
  
  return warnings || productName || extractedRxcui ? {
    warnings,
    productName,
    rxcui: extractedRxcui,
  } : null
}

