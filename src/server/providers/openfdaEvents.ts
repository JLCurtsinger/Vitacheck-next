import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import { TIMEOUT_FDA_EVENTS } from "../constants"
import type { ProviderResponse, FdaAdverseEventsResult } from "../types"

const OPENFDA_BASE_URL = "https://api.fda.gov/drug/event.json"

/**
 * Fetch adverse event reports for a drug pair from openFDA.
 */
export async function fetchAdverseEvents(
  normalizedValue1: string,
  normalizedValue2: string,
  rxcui1?: string,
  rxcui2?: string
): Promise<ProviderResponse<FdaAdverseEventsResult>> {
  const startTime = Date.now()
  
  try {
    // Build search query - search for events where both drugs are mentioned
    // Using RxCUI if available, otherwise drug names
    const searchParts: string[] = []
    
    if (rxcui1) {
      searchParts.push(`patient.drug.medicinalproduct:"${normalizedValue1}" OR patient.drug.openfda.rxcui:"${rxcui1}"`)
    } else {
      searchParts.push(`patient.drug.medicinalproduct:"${normalizedValue1}"`)
    }
    
    if (rxcui2) {
      searchParts.push(`patient.drug.medicinalproduct:"${normalizedValue2}" OR patient.drug.openfda.rxcui:"${rxcui2}"`)
    } else {
      searchParts.push(`patient.drug.medicinalproduct:"${normalizedValue2}"`)
    }
    
    const searchQuery = `(${searchParts[0]}) AND (${searchParts[1]})`
    
    // Aggregate by serious flag
    const url = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(searchQuery)}&count=serious.exact`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_FDA_EVENTS,
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
    
    // openFDA returns: { results: [{ term: "1", count: 123 }, { term: "2", count: 456 }] }
    let totalEvents = 0
    let seriousEvents = 0
    const outcomes: Record<string, number> = {}
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const count = result.count || 0
        totalEvents += count
        
        if (result.term === "1" || result.term === "Yes" || String(result.term).toLowerCase() === "serious") {
          seriousEvents += count
        }
        
        if (result.term) {
          outcomes[String(result.term)] = count
        }
      }
    }
    
    // Also get total count if not already aggregated
    if (totalEvents === 0 && data.meta && data.meta.results && data.meta.results.total) {
      totalEvents = data.meta.results.total
    }
    
    return {
      data: {
        totalEvents,
        seriousEvents,
        outcomes,
      },
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
 * Fetch adverse events for a single drug.
 */
export async function fetchSingleDrugAdverseEvents(
  normalizedValue: string,
  rxcui?: string
): Promise<ProviderResponse<FdaAdverseEventsResult>> {
  const startTime = Date.now()
  
  try {
    const searchQuery = rxcui
      ? `patient.drug.medicinalproduct:"${normalizedValue}" OR patient.drug.openfda.rxcui:"${rxcui}"`
      : `patient.drug.medicinalproduct:"${normalizedValue}"`
    
    const url = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(searchQuery)}&count=serious.exact`
    
    const response = await fetchWithTimeout(url, {
      timeout: TIMEOUT_FDA_EVENTS,
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
    
    let totalEvents = 0
    let seriousEvents = 0
    const outcomes: Record<string, number> = {}
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const count = result.count || 0
        totalEvents += count
        
        if (result.term === "1" || result.term === "Yes" || String(result.term).toLowerCase() === "serious") {
          seriousEvents += count
        }
        
        if (result.term) {
          outcomes[String(result.term)] = count
        }
      }
    }
    
    if (totalEvents === 0 && data.meta && data.meta.results && data.meta.results.total) {
      totalEvents = data.meta.results.total
    }
    
    return {
      data: {
        totalEvents,
        seriousEvents,
        outcomes,
      },
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

