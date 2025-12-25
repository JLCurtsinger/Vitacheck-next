import "server-only"
import { query } from "./query"
import { CALC_VERSION } from "../constants"
import type { InteractionResult, IndividualResult } from "../types"
import crypto from "crypto"

/**
 * Cache operations for the interaction checking pipeline.
 */

/**
 * Hash sources for cache invalidation.
 */
function hashSources(sources: any[]): string {
  const sourcesStr = JSON.stringify(sources.map((s) => ({
    name: s.name,
    severity: s.severity,
    summary: s.summary,
  })))
  return crypto.createHash("sha256").update(sourcesStr).digest("hex").substring(0, 16)
}

/**
 * Get medication lookup cache entry.
 * Returns null if:
 * - Entry doesn't exist
 * - Negative result (rxnorm_rxcui is null) and updated_at is older than 24 hours
 */
export async function getMedLookupCache(
  normalizedValue: string,
  forceRefresh: boolean = false
): Promise<{
  rxnorm_rxcui: string | null
  suppai_id: string | null
  fda_label_warnings: any | null
  fda_label_rxcui: string | null
  updated_at: Date
} | null> {
  if (forceRefresh) {
    return null
  }
  
  const result = await query<{
    rxnorm_rxcui: string | null
    suppai_id: string | null
    fda_label_warnings: any | null
    fda_label_rxcui: string | null
    updated_at: Date
  }>(
    `SELECT rxnorm_rxcui, suppai_id, fda_label_warnings, fda_label_rxcui, updated_at
     FROM med_lookup_cache
     WHERE normalized_value = $1`,
    [normalizedValue]
  )
  
  if (!result.rows[0]) {
    return null
  }
  
  const cached = result.rows[0]
  const updatedAt = new Date(cached.updated_at)
  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
  
  // If negative result (rxnorm_rxcui is null) and older than 24 hours, invalidate
  if (cached.rxnorm_rxcui === null && hoursSinceUpdate > 24) {
    return null
  }
  
  // If negative suppai result (suppai_id is null) and older than 24 hours, invalidate
  if (cached.suppai_id === null && hoursSinceUpdate > 24) {
    // Still return the entry but mark suppai_id as needing refresh
    // We'll handle this in orchestrator by checking if it's stale
  }
  
  return cached
}

/**
 * Set medication lookup cache entry.
 */
export async function setMedLookupCache(
  normalizedValue: string,
  data: {
    rxnorm_rxcui?: string | null
    suppai_id?: string | null
    fda_label_warnings?: any | null
    fda_label_rxcui?: string | null
  }
): Promise<void> {
  await query(
    `INSERT INTO med_lookup_cache (normalized_value, rxnorm_rxcui, suppai_id, fda_label_warnings, fda_label_rxcui, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (normalized_value)
     DO UPDATE SET
       rxnorm_rxcui = EXCLUDED.rxnorm_rxcui,
       suppai_id = EXCLUDED.suppai_id,
       fda_label_warnings = EXCLUDED.fda_label_warnings,
       fda_label_rxcui = EXCLUDED.fda_label_rxcui,
       updated_at = NOW()`,
    [
      normalizedValue,
      data.rxnorm_rxcui || null,
      data.suppai_id || null,
      data.fda_label_warnings ? JSON.stringify(data.fda_label_warnings) : null,
      data.fda_label_rxcui || null,
    ]
  )
}

/**
 * Get pair interaction cache entry.
 */
export async function getPairInteractionCache(
  pairKey: string,
  forceRefresh: boolean = false
): Promise<InteractionResult | null> {
  if (forceRefresh) {
    return null
  }
  
  const result = await query<{
    result_json: InteractionResult
    calc_version: string
  }>(
    `SELECT result_json, calc_version
     FROM pair_interaction_cache
     WHERE pair_key = $1 AND calc_version = $2`,
    [pairKey, CALC_VERSION]
  )
  
  return result.rows[0]?.result_json || null
}

/**
 * Set pair interaction cache entry.
 */
export async function setPairInteractionCache(
  pairKey: string,
  aValue: string,
  bValue: string,
  result: InteractionResult
): Promise<void> {
  const sourcesHash = hashSources(result.sources)
  
  await query(
    `INSERT INTO pair_interaction_cache (pair_key, a_value, b_value, result_json, sources_hash, calc_version, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (pair_key)
     DO UPDATE SET
       result_json = EXCLUDED.result_json,
       sources_hash = EXCLUDED.sources_hash,
       calc_version = EXCLUDED.calc_version,
       updated_at = NOW()`,
    [
      pairKey,
      aValue,
      bValue,
      JSON.stringify(result),
      sourcesHash,
      CALC_VERSION,
    ]
  )
}

/**
 * Get CMS usage cache entry.
 */
export async function getCmsUsageCache(
  normalizedValue: string,
  forceRefresh: boolean = false
): Promise<{
  beneficiaries: number | null
  year: number | null
  source_meta: any | null
} | null> {
  if (forceRefresh) {
    return null
  }
  
  const result = await query<{
    beneficiaries: number | null
    year: number | null
    source_meta: any | null
  }>(
    `SELECT beneficiaries, year, source_meta
     FROM cms_usage_cache
     WHERE normalized_value = $1`,
    [normalizedValue]
  )
  
  return result.rows[0] || null
}

/**
 * Set CMS usage cache entry.
 */
export async function setCmsUsageCache(
  normalizedValue: string,
  data: {
    beneficiaries?: number | null
    year?: number | null
    source_meta?: any | null
  }
): Promise<void> {
  await query(
    `INSERT INTO cms_usage_cache (normalized_value, beneficiaries, year, source_meta, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (normalized_value)
     DO UPDATE SET
       beneficiaries = EXCLUDED.beneficiaries,
       year = EXCLUDED.year,
       source_meta = EXCLUDED.source_meta,
       updated_at = NOW()`,
    [
      normalizedValue,
      data.beneficiaries || null,
      data.year || null,
      data.source_meta ? JSON.stringify(data.source_meta) : null,
    ]
  )
}

/**
 * Log interaction check (optional analytics).
 */
export async function logInteractionCheck(
  items: any[],
  resultSummary: any,
  latencyMs: number,
  cacheHits: any
): Promise<void> {
  try {
    await query(
      `INSERT INTO interaction_checks_log (items, result_summary, latency_ms, cache_hits)
       VALUES ($1, $2, $3, $4)`,
      [
        JSON.stringify(items),
        JSON.stringify(resultSummary),
        latencyMs,
        JSON.stringify(cacheHits),
      ]
    )
  } catch (error) {
    // Don't fail the request if logging fails
    console.error("Failed to log interaction check:", error)
  }
}

