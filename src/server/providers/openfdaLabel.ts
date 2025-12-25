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
  
  // Special case: if querying ibuprofen, reject labels that indicate naproxen/naproxen sodium
  if (queriedLower === "ibuprofen") {
    // Check generic_name array
    if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
      for (const name of result.openfda.generic_name) {
        const nameLower = String(name).toLowerCase()
        if (nameLower.includes("naproxen")) {
          return true
        }
      }
    }
    
    // Check substance_name array
    if (result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
      for (const name of result.openfda.substance_name) {
        const nameLower = String(name).toLowerCase()
        if (nameLower.includes("naproxen")) {
          return true
        }
      }
    }
    
    // Check brand_name array
    if (result.openfda?.brand_name && Array.isArray(result.openfda.brand_name)) {
      for (const name of result.openfda.brand_name) {
        const nameLower = String(name).toLowerCase()
        if (nameLower.includes("naproxen")) {
          return true
        }
      }
    }
  }
  
  // General check for other NSAIDs
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
  
  // Log normalized term and number of candidate records
  console.log(`[openFDA Label] normalized term: "${normalizedValue}", candidate records: ${data.results.length}`)
  
  const result = data.results[0]
  
  // Determine which field was used (for RxCUI matches, check what fields are available)
  let matchedField = "rxcui"
  if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
    for (const name of result.openfda.generic_name) {
      const nameLower = String(name).toLowerCase()
      if (nameLower === normalizedValue.toLowerCase()) {
        matchedField = "generic_name"
        break
      }
    }
  }
  if (matchedField === "rxcui" && result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
    for (const name of result.openfda.substance_name) {
      const nameLower = String(name).toLowerCase()
      if (nameLower === normalizedValue.toLowerCase() || nameLower.includes(normalizedValue.toLowerCase())) {
        matchedField = "substance_name"
        break
      }
    }
  }
  
  // Check if label's primary ingredient matches (reject if different primary ingredient)
  // For RxCUI matches, be more lenient - only reject clear mismatches
  if (!isPrimaryIngredientMatch(result, normalizedValue, false)) {
    return null
  }
  
  // Check if label contains other NSAIDs - reject if so
  if (labelContainsOtherNSAIDs(result, normalizedValue)) {
    return null
  }
  
  const extracted = extractWarningsAndMetadata(result, normalizedValue, requireMatch)
  
  // Log which record was selected and warnings count
  if (extracted) {
    const warningsCount = extracted.warnings ? extracted.warnings.length : 0
    console.log(`[openFDA Label] selected record: ${matchedField}, warnings count: ${warningsCount}`)
  }
  
  return extracted
}

/**
 * Check if a label's primary ingredient matches the queried medication
 * Returns true if the label is for the queried medication, false if it's for a different primary ingredient
 * @param requireMatch - if true, requires an explicit match; if false (for RxCUI matches), only rejects clear mismatches
 */
function isPrimaryIngredientMatch(result: any, queriedMedication: string, requireMatch: boolean = true): boolean {
  const queriedLower = queriedMedication.toLowerCase()
  
  // Prefer exact match on generic_name (case-insensitive)
  if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
    for (const name of result.openfda.generic_name) {
      const nameLower = String(name).toLowerCase()
      if (nameLower === queriedLower) {
        return true
      }
    }
  }
  
  // Check substance_name for exact match or inclusion
  if (result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
    for (const name of result.openfda.substance_name) {
      const nameLower = String(name).toLowerCase()
      if (nameLower === queriedLower || nameLower.includes(queriedLower)) {
        return true
      }
    }
  }
  
  // Check generic_name for inclusion (less strict)
  if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
    for (const name of result.openfda.generic_name) {
      const nameLower = String(name).toLowerCase()
      if (nameLower.includes(queriedLower)) {
        return true
      }
    }
  }
  
  // Check if any primary ingredient field contains other NSAIDs as primary ingredient
  // If generic_name or substance_name contains another NSAID as the primary ingredient, reject
  if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
    for (const name of result.openfda.generic_name) {
      const nameLower = String(name).toLowerCase()
      // Check if this is a different NSAID (not the queried one)
      for (const nsaid of OTHER_NSAIDS) {
        const nsaidLower = nsaid.toLowerCase()
        if (nsaidLower !== queriedLower && 
            !queriedLower.includes(nsaidLower) && 
            !nsaidLower.includes(queriedLower) &&
            (nameLower === nsaidLower || nameLower.includes(nsaidLower))) {
          // This label is primarily for a different NSAID - always reject
          return false
        }
      }
    }
  }
  
  // If requireMatch is false (for RxCUI matches), accept unless we found a clear mismatch above
  if (!requireMatch) {
    return true
  }
  
  // Otherwise, require an explicit match
  return false
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
  
  // Log normalized term and number of candidate records
  console.log(`[openFDA Label] normalized term: "${normalizedValue}", candidate records: ${data.results.length}`)
  
  const normalizedLower = normalizedValue.toLowerCase()
  
  // Find first result that matches
  for (const result of data.results) {
    let matches = false
    
    // Strategy 1: Prefer exact match on generic_name
    if (fieldType === "generic_name" || fieldType === "any") {
      if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
        for (const name of result.openfda.generic_name) {
          const nameLower = String(name).toLowerCase()
          if (nameLower === normalizedLower) {
            matches = true
            break
          }
        }
      }
      // Also check non-openfda generic_name
      if (!matches && result.generic_name && Array.isArray(result.generic_name)) {
        for (const name of result.generic_name) {
          const nameLower = String(name).toLowerCase()
          if (nameLower === normalizedLower) {
            matches = true
            break
          }
        }
      }
      // Fallback to includes match
      if (!matches && result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
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
    
    // Strategy 2: Check substance_name (prefer exact or includes)
    if (!matches && (fieldType === "generic_name" || fieldType === "any")) {
      if (result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
        for (const name of result.openfda.substance_name) {
          const nameLower = String(name).toLowerCase()
          if (nameLower === normalizedLower || nameLower.includes(normalizedLower)) {
            matches = true
            break
          }
        }
      }
    }
    
    // Strategy 3: Check brand_name (less preferred)
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
    
    if (matches) {
      // Determine which field was used for matching
      let matchedField = "unknown"
      if (fieldType === "generic_name" || fieldType === "any") {
        if (result.openfda?.generic_name && Array.isArray(result.openfda.generic_name)) {
          for (const name of result.openfda.generic_name) {
            const nameLower = String(name).toLowerCase()
            if (nameLower === normalizedLower) {
              matchedField = "generic_name"
              break
            }
          }
        }
        if (matchedField === "unknown" && result.openfda?.substance_name && Array.isArray(result.openfda.substance_name)) {
          for (const name of result.openfda.substance_name) {
            const nameLower = String(name).toLowerCase()
            if (nameLower === normalizedLower || nameLower.includes(normalizedLower)) {
              matchedField = "substance_name"
              break
            }
          }
        }
      } else if (fieldType === "brand_name") {
        matchedField = "brand_name"
      }
      
      // Check if label's primary ingredient matches (reject if different primary ingredient)
      if (!isPrimaryIngredientMatch(result, normalizedValue)) {
        continue
      }
      
      // Check if label contains other NSAIDs - reject if so
      if (labelContainsOtherNSAIDs(result, normalizedValue)) {
        continue
      }
      
      const extracted = extractWarningsAndMetadata(result, normalizedValue, true)
      
      // Log which record was selected and warnings count
      if (extracted) {
        const warningsCount = extracted.warnings ? extracted.warnings.length : 0
        console.log(`[openFDA Label] selected record: ${matchedField}, warnings count: ${warningsCount}`)
      }
      
      return extracted
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

