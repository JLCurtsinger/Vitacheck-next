import "server-only"

/**
 * Constants for the interaction checking pipeline.
 */

// Calculation version - increment when logic changes to invalidate cache
export const CALC_VERSION = "v1.0.0"

// Concurrency limits
export const MAX_CONCURRENT_UPSTREAM_CALLS = 6
export const MAX_CONCURRENT_PAIR_COMPUTATIONS = 3

// Timeouts (milliseconds)
export const TIMEOUT_RXNORM_LOOKUP = 6000
export const TIMEOUT_RXNORM_INTERACTIONS = 10000
export const TIMEOUT_SUPPAI = 10000
export const TIMEOUT_FDA_LABEL = 8000
export const TIMEOUT_FDA_EVENTS = 10000
export const TIMEOUT_CMS_PARTD = 4000

// Retry settings
export const FDA_LABEL_MAX_RETRIES = 2
export const FDA_LABEL_RETRY_BACKOFF_MS = 500

// Input limits
export const MAX_ITEMS_PER_REQUEST = 10

// Source reliability weights (for consensus calculation)
export const SOURCE_WEIGHTS: Record<string, number> = {
  "RxNorm": 1.0, // high
  "FDA Label": 0.9, // high (but moderate for combo inference)
  "SUPP.AI": 0.6, // medium
  "openFDA Adverse Events": 0.7, // medium (can be boosted by exposure)
  "AI Literature": 0.5, // medium (never sole source for severe)
}

// Base confidence scores per source type
export const BASE_CONFIDENCE: Record<string, number> = {
  "RxNorm": 0.85,
  "FDA Label": 0.80,
  "SUPP.AI": 0.70,
  "openFDA Adverse Events": 0.65,
  "AI Literature": 0.60,
}

