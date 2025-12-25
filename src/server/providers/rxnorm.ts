import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import { TIMEOUT_RXNORM_LOOKUP, TIMEOUT_RXNORM_INTERACTIONS } from "../constants"
import type { ProviderResponse, RxNormLookupResult, RxNormInteractionResult, InteractionSeverity } from "../types"
import { fetchRxNormInteractionsCore } from "./rxnormCore"

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
 * 
 * Note: The RxNorm interactions API was discontinued in January 2024, so 404 responses
 * are expected and should be treated as "no interactions found" rather than errors.
 */
export async function getInteractions(
  rxcui1: string,
  rxcui2: string
): Promise<ProviderResponse<RxNormInteractionResult>> {
  const startTime = Date.now()
  
  try {
    // Log URL and parameters if DEBUG_RXNORM is enabled
    if (process.env.DEBUG_RXNORM === "true") {
      const url = `${RXNORM_BASE_URL}/interaction/interaction.json?rxcui=${rxcui1}`
      console.log("[rxnorm-interactions] url =", url, "rxcuis =", rxcui1, rxcui2)
    }
    
    // Use core fetch logic (can be tested independently)
    const result = await fetchRxNormInteractionsCore(rxcui1, rxcui2, TIMEOUT_RXNORM_INTERACTIONS)
    
    if (process.env.DEBUG_RXNORM === "true" && result.status === 404) {
      console.log("[rxnorm-interactions] 404 response - treating as no interactions found")
    }
    
    // Handle 404 as "no interactions found" (normalized success case)
    if (result.status === 404) {
      return {
        data: null,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    // Handle other errors
    if (result.error) {
      return {
        data: null,
        error: result.error,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    // Return successful result (data may be null if no interaction found)
    return {
      data: result.data,
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

