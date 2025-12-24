/**
 * Client-facing API types (mirror of server types for type safety).
 * These types match the server response structure.
 */

export type InteractionSeverity = "none" | "mild" | "moderate" | "severe" | "unknown"

export interface InteractionSource {
  name: string
  severity: InteractionSeverity
  confidence: number
  summary: string
  details: Record<string, any>
  citations?: string[]
  stats?: {
    eventCounts?: number
    seriousEventCounts?: number
    beneficiaries?: number
    eventRate?: number
    seriousEventRate?: number
    denominatorMethod?: string
    [key: string]: any
  }
  lastUpdated: string
}

export interface InteractionResult {
  itemA: string
  itemB: string
  severity: InteractionSeverity
  confidence: number
  sources: InteractionSource[]
  summary: string
  keyNotes: string[]
}

export interface CombinedInteractionResult {
  items: string[]
  severity: InteractionSeverity
  confidence: number
  sources: InteractionSource[]
  summary: string
  keyNotes: string[]
  pairResults: InteractionResult[]
}

export interface IndividualResult {
  itemName: string
  safetySummary: string
  sources: InteractionSource[]
}

export interface InteractionCheckRequest {
  items: Array<{
    value: string
    display?: string
    type?: "drug" | "supplement" | "unknown"
  }>
  options?: {
    includeAi?: boolean
  }
}

export interface InteractionCheckResponse {
  items: Array<{
    normalized: string
    original: string
  }>
  results: {
    singles: IndividualResult[]
    pairs: InteractionResult[]
    triples: CombinedInteractionResult[]
  }
  meta: {
    calcVersion: string
    cacheStats: {
      medLookupHits: number
      medLookupMisses: number
      pairCacheHits: number
      pairCacheMisses: number
      cmsCacheHits: number
      cmsCacheMisses: number
    }
    timing: {
      totalMs: number
      lookupMs: number
      pairProcessingMs: number
      tripleProcessingMs: number
    }
  }
}

