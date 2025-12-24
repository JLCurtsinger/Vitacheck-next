import "server-only"
import { fetchWithRetry } from "../utils/timeout"
import { TIMEOUT_FDA_LABEL, FDA_LABEL_MAX_RETRIES, FDA_LABEL_RETRY_BACKOFF_MS } from "../constants"
import type { ProviderResponse, FdaLabelResult } from "../types"

const OPENFDA_BASE_URL = "https://api.fda.gov/drug/label.json"

/**
 * Common NSAIDs and related drugs that should not appear in warnings for other medications
 */
const OTHER_NSAIDS = [
  "naproxen",
  "naproxen sodium",
  "aspirin",
  "acetylsalicylic acid",
  "diclofenac",
  "diclofenac sodium",
  "celecoxib",
  "meloxicam",
  "indomethacin",
  "ketorolac",
  "piroxicam",
  "sulindac",
  "tolmetin",
  "etodolac",
  "nabumetone",
  "oxaprozin",
  "fenoprofen",
  "flurbiprofen",
  "ketoprofen",
]

/**
 * Check if text contains mentions of other NSAIDs (excluding the queried medication)
 */
function containsOtherNSAIDs(text: string, queriedMedication: string): boolean {
  const textLower = text.toLowerCase()
  const queriedLower = queriedMedication.toLowerCase()
  
  for (const nsaid of OTHER_NSAIDS) {
    const nsaidLower = nsaid.toLowerCase()
    // Skip if the NSAID is the queried medication itself
    if (nsaidLower === queriedLower || queriedLower.includes(nsaidLower) || nsaidLower.includes(queriedLower)) {
      continue
    }
    // Check if the NSAID appears in the text
    if (textLower.includes(nsaidLower)) {
      return true
    }
  }
  
  return false
}

/**
 * Check if label data contains other NSAIDs in generic_name or substance_name
 */
function labelContainsOtherNSAIDs(result: any, queriedMedication: string): boolean {
  const queriedLower = queriedMedication.toLowerCase()
  
  // Check generic_name array
  if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
    for (const name of result.openfda.generic_name) {
      const nameLower = String(name).toLowerCase()
      // If this name matches the queried medication, skip
      if (nameLower === queriedLower || nameLower.includes(queriedLower) || queriedLower.includes(nameLower)) {
        continue
      }
      // Check if this name is another NSAID
      if (containsOtherNSAIDs(nameLower, queriedMedication)) {
        return true
      }
    }
  }
  
  // Check substance_name array
  if (result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
    for (const name of result.openfda.substance_name) {
      const nameLower = String(name).toLowerCase()
      // If this name matches the queried medication, skip
      if (nameLower === queriedLower || nameLower.includes(queriedLower) || queriedLower.includes(nameLower)) {
        continue
      }
      // Check if this name is another NSAID
      if (containsOtherNSAIDs(nameLower, queriedMedication)) {
        return true
      }
    }
  }
  
  return false
}

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
 * Extract FDA label data from response (for RxCUI matches - still need to filter for other NSAIDs)
 */
function extractFdaLabelData(data: any, normalizedValue: string, requireMatch: boolean = false): FdaLabelResult | null {
  if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
    return null
  }
  
  const result = data.results[0]
  
  // Check if label contains other NSAIDs - reject if so
  if (labelContainsOtherNSAIDs(result, normalizedValue)) {
    return null
  }
  
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
      // Check if label contains other NSAIDs - reject if so
      if (labelContainsOtherNSAIDs(result, normalizedValue)) {
        continue
      }
      
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
  
  // Filter warnings: reject any that mention other NSAIDs
  if (warnings) {
    warnings = warnings.filter(warning => {
      const warningText = String(warning)
      return !containsOtherNSAIDs(warningText, normalizedValue)
    })
    
    // If all warnings were filtered out, set to undefined
    if (warnings.length === 0) {
      warnings = undefined
    }
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

