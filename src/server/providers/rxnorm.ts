import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import { TIMEOUT_RXNORM_LOOKUP, TIMEOUT_RXNORM_INTERACTIONS } from "../constants"
import type { ProviderResponse, RxNormLookupResult, RxNormInteractionResult, InteractionSeverity } from "../types"

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

/**
 * Lookup RxCUI from a medication name.
 */
export async function lookupRxCUI(
  normalizedValue: string
): Promise<ProviderResponse<RxNormLookupResult>> {
  const startTime = Date.now()
  
  try {
    // Use RxTerms API for name-to-RxCUI lookup
    const url = `${RXNORM_BASE_URL}/rxterms/rxcui?name=${encodeURIComponent(normalizedValue)}`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_RXNORM_LOOKUP,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await response.json()
    
    // RxTerms returns: { rxcui: "12345" } or similar structure
    // May also return array format
    let rxcui: string | undefined
    
    if (data.rxcui) {
      rxcui = String(data.rxcui)
    } else if (Array.isArray(data) && data.length > 0 && data[0].rxcui) {
      rxcui = String(data[0].rxcui)
    } else if (data.rxtermsProperties && Array.isArray(data.rxtermsProperties) && data.rxtermsProperties.length > 0) {
      rxcui = String(data.rxtermsProperties[0].rxcui || "")
    }
    
    return {
      data: rxcui ? { rxcui } : null,
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
 * Get interactions between two RxCUIs.
 */
export async function getInteractions(
  rxcui1: string,
  rxcui2: string
): Promise<ProviderResponse<RxNormInteractionResult>> {
  const startTime = Date.now()
  
  try {
    const url = `${RXNORM_BASE_URL}/interaction/interaction.json?rxcui=${rxcui1}&rxcui=${rxcui2}`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_RXNORM_INTERACTIONS,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await response.json()
    
    // RxNorm interaction API returns:
    // { interactionTypeGroup: [{ interactionType: [{ interactionPair: [...] }] }] }
    let severity: InteractionSeverity | undefined
    let description: string | undefined
    
    if (data.interactionTypeGroup && Array.isArray(data.interactionTypeGroup)) {
      for (const group of data.interactionTypeGroup) {
        if (group.interactionType && Array.isArray(group.interactionType)) {
          for (const type of group.interactionType) {
            if (type.interactionPair && Array.isArray(type.interactionPair)) {
              for (const pair of type.interactionPair) {
                if (pair.description) {
                  description = pair.description
                  
                  // Map RxNorm severity to our severity
                  if (pair.severity) {
                    const sev = pair.severity.toLowerCase()
                    if (sev.includes("major") || sev.includes("severe")) {
                      severity = "severe"
                    } else if (sev.includes("moderate")) {
                      severity = "moderate"
                    } else if (sev.includes("minor") || sev.includes("mild")) {
                      severity = "mild"
                    } else {
                      severity = "unknown"
                    }
                  }
                  
                  // Take first interaction found
                  break
                }
              }
            }
          }
        }
      }
    }
    
    return {
      data: severity || description ? { severity, description, source: "RxNorm" } : null,
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

