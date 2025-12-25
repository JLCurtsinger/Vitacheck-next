/**
 * Core RxNorm fetch logic without server-only dependencies.
 * This module can be imported by test scripts that run outside Next.js.
 */

// Define types inline to avoid server-only imports
type InteractionSeverity = "none" | "mild" | "moderate" | "severe" | "unknown"

interface RxNormInteractionResult {
  severity?: InteractionSeverity
  description?: string
  source?: string
}

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

/**
 * Fetch interactions for a single RxCUI and search for a second RxCUI.
 * This is the core fetch logic without server-only dependencies.
 */
export async function fetchRxNormInteractionsCore(
  rxcui1: string,
  rxcui2: string,
  timeoutMs: number = 10000
): Promise<{
  status: number
  data: RxNormInteractionResult | null
  error?: string
  url: string
}> {
  const url = `${RXNORM_BASE_URL}/interaction/interaction.json?rxcui=${rxcui1}`
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
    
    clearTimeout(timeoutId)
    
    const status = response.status
    
    if (!response.ok) {
      // 404 means no interactions found (API discontinued)
      if (status === 404) {
        return {
          status,
          data: null,
          url,
        }
      }
      
      return {
        status,
        data: null,
        error: `HTTP ${status}`,
        url,
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
                  
                  // Found the interaction
                  return {
                    status,
                    data: { severity, description, source: "RxNorm" },
                    url,
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // rxcui2 not found in any interactions
    return {
      status,
      data: null,
      url,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: 0,
        data: null,
        error: `Request timeout after ${timeoutMs}ms`,
        url,
      }
    }
    return {
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      url,
    }
  }
}

