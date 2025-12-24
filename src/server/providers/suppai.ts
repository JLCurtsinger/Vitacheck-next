import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import { TIMEOUT_SUPPAI } from "../constants"
import type { ProviderResponse, SuppAiResult, InteractionSeverity } from "../types"

const SUPPAI_BASE_URL = "https://supp.ai/api"

/**
 * Lookup SUPP.AI identifier for a medication/supplement.
 */
export async function lookupSuppAiId(
  normalizedValue: string
): Promise<ProviderResponse<{ id: string }>> {
  const startTime = Date.now()
  
  // SUPP.AI API key from environment
  const apiKey = process.env.SUPPAI_API_KEY
  
  if (!apiKey) {
    return {
      data: null,
      error: "SUPPAI_API_KEY not configured",
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
  
  try {
    // SUPP.AI search endpoint
    const url = `${SUPPAI_BASE_URL}/search?q=${encodeURIComponent(normalizedValue)}`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_SUPPAI,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    
    // SUPP.AI returns array of results or object with results array
    let id: string | undefined
    
    if (Array.isArray(data) && data.length > 0) {
      id = data[0].id || data[0]._id
    } else if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      id = data.results[0].id || data.results[0]._id
    } else if (data.id || data._id) {
      id = data.id || data._id
    }
    
    return {
      data: id ? { id } : null,
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
 * Get interactions between two items using SUPP.AI.
 */
export async function getInteractions(
  item1: string,
  item2: string,
  suppAiId1?: string,
  suppAiId2?: string
): Promise<ProviderResponse<SuppAiResult>> {
  const startTime = Date.now()
  
  const apiKey = process.env.SUPPAI_API_KEY
  
  if (!apiKey) {
    return {
      data: null,
      error: "SUPPAI_API_KEY not configured",
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
  
  try {
    // SUPP.AI interaction endpoint - may require IDs or names
    // Adjust URL based on actual SUPP.AI API documentation
    const url = suppAiId1 && suppAiId2
      ? `${SUPPAI_BASE_URL}/interactions?id1=${suppAiId1}&id2=${suppAiId2}`
      : `${SUPPAI_BASE_URL}/interactions?name1=${encodeURIComponent(item1)}&name2=${encodeURIComponent(item2)}`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_SUPPAI,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    
    // Parse SUPP.AI interaction response
    // Adjust parsing based on actual API response structure
    let interactions: Array<{ severity?: InteractionSeverity; description?: string }> | undefined
    
    if (data.interactions && Array.isArray(data.interactions)) {
      interactions = data.interactions.map((int: any) => ({
        severity: mapSuppAiSeverity(int.severity),
        description: int.description || int.summary,
      }))
    } else if (data.severity || data.description) {
      interactions = [{
        severity: mapSuppAiSeverity(data.severity),
        description: data.description || data.summary,
      }]
    }
    
    return {
      data: interactions ? { interactions } : null,
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

function mapSuppAiSeverity(severity: string | undefined): InteractionSeverity | undefined {
  if (!severity) return undefined
  
  const sev = severity.toLowerCase()
  if (sev.includes("severe") || sev.includes("major") || sev.includes("high")) {
    return "severe"
  }
  if (sev.includes("moderate") || sev.includes("medium")) {
    return "moderate"
  }
  if (sev.includes("mild") || sev.includes("minor") || sev.includes("low")) {
    return "mild"
  }
  return "unknown"
}

