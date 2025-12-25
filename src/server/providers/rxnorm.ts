import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import { TIMEOUT_RXNORM_LOOKUP, TIMEOUT_RXNORM_INTERACTIONS } from "../constants"
import type { ProviderResponse, RxNormLookupResult, RxNormInteractionResult, InteractionSeverity } from "../types"

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

/**
 * Lookup RxCUI from a medication name.
 * Uses RxNorm approximateTerm endpoint for reliable name matching.
 */
export async function lookupRxCUI(
  normalizedValue: string
): Promise<ProviderResponse<RxNormLookupResult>> {
  const startTime = Date.now()
  
  try {
    // Use RxNorm approximateTerm endpoint for reliable name-to-RxCUI lookup
    // This endpoint handles variations and returns the best match
    const url = `${RXNORM_BASE_URL}/approximateTerm.json?term=${encodeURIComponent(normalizedValue)}&maxEntries=1`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_RXNORM_LOOKUP,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (!response.ok) {
      // For 404 or no results, return ok=false with clear error message
      if (response.status === 404) {
        return {
          data: null,
          error: "not found",
          cached: false,
          timingMs: Date.now() - startTime,
        }
      }
      return {
        data: null,
        error: `HTTP ${response.status}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await response.json()
    
    // approximateTerm returns: { approximateGroup: { candidate: [{ rxcui: "12345", ... }] } }
    let rxcui: string | undefined
    
    if (data.approximateGroup?.candidate && Array.isArray(data.approximateGroup.candidate) && data.approximateGroup.candidate.length > 0) {
      const candidate = data.approximateGroup.candidate[0]
      if (candidate.rxcui) {
        rxcui = String(candidate.rxcui)
      }
    }
    
    // Fallback: try RxTerms endpoint if approximateTerm didn't return a result
    if (!rxcui) {
      const rxtermsUrl = `${RXNORM_BASE_URL}/rxterms/rxcui?name=${encodeURIComponent(normalizedValue)}`
      const rxtermsResponse = await fetchWithTimeout(rxtermsUrl, {
        timeout: TIMEOUT_RXNORM_LOOKUP,
        headers: {
          Accept: "application/json",
        },
      })
      
      if (rxtermsResponse.ok) {
        const rxtermsData = await rxtermsResponse.json()
        
        if (rxtermsData.rxcui) {
          rxcui = String(rxtermsData.rxcui)
        } else if (Array.isArray(rxtermsData) && rxtermsData.length > 0 && rxtermsData[0].rxcui) {
          rxcui = String(rxtermsData[0].rxcui)
        } else if (rxtermsData.rxtermsProperties && Array.isArray(rxtermsData.rxtermsProperties) && rxtermsData.rxtermsProperties.length > 0) {
          rxcui = String(rxtermsData.rxtermsProperties[0].rxcui || "")
        }
      }
    }
    
    // If still no RxCUI found, return ok=false with clear error message
    if (!rxcui) {
      return {
        data: null,
        error: "not found",
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    return {
      data: { rxcui },
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
 * Calls the single-RxCUI endpoint and checks if the second RxCUI appears in the interactions.
 */
export async function getInteractions(
  rxcui1: string,
  rxcui2: string
): Promise<ProviderResponse<RxNormInteractionResult>> {
  const startTime = Date.now()
  
  try {
    // Call single-RxCUI endpoint to get all interactions for rxcui1
    const url = `${RXNORM_BASE_URL}/interaction/interaction.json?rxcui=${rxcui1}`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_RXNORM_INTERACTIONS,
      headers: {
        Accept: "application/json",
      },
    })
    
    if (!response.ok) {
      // HTTP error - return error message
      return {
        data: null,
        error: `HTTP ${response.status}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await response.json()
    
    // RxNorm interaction API returns:
    // { interactionTypeGroup: [{ interactionType: [{ interactionPair: [{ minConceptItem: [{ rxcui: "..." }], description: "...", severity: "..." }] }] }] }
    let severity: InteractionSeverity | undefined
    let description: string | undefined
    
    // Search through all interaction pairs to find if rxcui2 appears
    if (data.interactionTypeGroup && Array.isArray(data.interactionTypeGroup)) {
      for (const group of data.interactionTypeGroup) {
        if (group.interactionType && Array.isArray(group.interactionType)) {
          for (const type of group.interactionType) {
            if (type.interactionPair && Array.isArray(type.interactionPair)) {
              for (const pair of type.interactionPair) {
                // Check if rxcui2 appears in this interaction pair (but not rxcui1)
                let foundRxcui2 = false
                
                // Check minConceptItem array for matching RxCUI
                if (pair.minConceptItem && Array.isArray(pair.minConceptItem)) {
                  for (const item of pair.minConceptItem) {
                    const itemRxcui = item.rxcui ? String(item.rxcui) : null
                    // Found rxcui2 and it's different from rxcui1
                    if (itemRxcui === String(rxcui2) && itemRxcui !== String(rxcui1)) {
                      foundRxcui2 = true
                      break
                    }
                  }
                }
                
                // If rxcui2 found in this pair, extract severity and description
                if (foundRxcui2 && pair.description) {
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
                  
                  // Found the interaction, return it
                  return {
                    data: { severity, description, source: "RxNorm" },
                    cached: false,
                    timingMs: Date.now() - startTime,
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // rxcui2 not found in any interactions - return ok with null data
    return {
      data: null,
      cached: false,
      timingMs: Date.now() - startTime,
    }
  } catch (error) {
    // On error, return error message
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
}

