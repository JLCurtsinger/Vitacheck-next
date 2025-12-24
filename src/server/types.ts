import "server-only"

/**
 * Core types for the interaction checking pipeline.
 * All types are server-only and should not be imported by client code.
 */

export type InteractionSeverity = "none" | "mild" | "moderate" | "severe" | "unknown"

export interface InteractionSource {
  name: string // e.g., "RxNorm", "SUPP.AI", "FDA Label", "openFDA Adverse Events", "AI Literature"
  severity: InteractionSeverity
  confidence: number // 0..1
  summary: string // short description
  details: Record<string, any> // jsonb-safe object
  citations?: string[] // array of urls/ids if available
  stats?: {
    eventCounts?: number
    seriousEventCounts?: number
    beneficiaries?: number
    eventRate?: number // fraction
    seriousEventRate?: number // fraction
    denominatorMethod?: string
    [key: string]: any
  }
  lastUpdated: string // ISO string
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
  items: string[] // 3+ items
  severity: InteractionSeverity
  confidence: number
  sources: InteractionSource[]
  summary: string
  keyNotes: string[]
  pairResults: InteractionResult[] // underlying pair results
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
    includeCms?: boolean
    debug?: boolean
  }
}

export interface ProviderStatus {
  attempted: boolean
  ok: boolean
  ms: number
  cached: boolean
  error?: string
}

export interface DebugInfo {
  providerStatuses: Record<string, ProviderStatus>
  rxcuiResolutions?: Record<string, string | null>
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
  debug?: DebugInfo
}

// Provider response types
export interface ProviderResponse<T = any> {
  data: T | null
  error?: string
  cached: boolean
  timingMs: number
}

export interface RxNormLookupResult {
  rxcui?: string
  name?: string
}

export interface RxNormInteractionResult {
  severity?: InteractionSeverity
  description?: string
  source?: string
}

export interface SuppAiResult {
  id?: string
  interactions?: Array<{
    severity?: InteractionSeverity
    description?: string
  }>
}

export interface FdaLabelResult {
  warnings?: string[]
  rxcui?: string
  productName?: string
}

export interface FdaAdverseEventsResult {
  totalEvents: number
  seriousEvents: number
  outcomes?: Record<string, number>
}

export interface CmsPartDResult {
  beneficiaries: number
  year?: number
  sourceMeta?: Record<string, any>
}

