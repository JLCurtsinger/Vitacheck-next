import "server-only"
import type { InteractionSource } from "../../types"
import { BASE_CONFIDENCE } from "../../constants"

/**
 * Calculate confidence score for a source, adjusting based on evidence quality/quantity
 * and CMS beneficiary counts.
 */
export function calculateConfidence(source: InteractionSource): number {
  let confidence = BASE_CONFIDENCE[source.name] || 0.5
  
  // Adjust based on evidence quality
  if (source.stats) {
    // Boost confidence if we have beneficiary data (exposure context)
    if (source.stats.beneficiaries && source.stats.beneficiaries > 0) {
      // Higher beneficiaries = higher confidence (capped)
      const beneficiaryBoost = Math.min(
        Math.log10(source.stats.beneficiaries + 1) / 10, // logarithmic boost
        0.15 // max 15% boost
      )
      confidence += beneficiaryBoost
    }
    
    // Boost confidence if we have event rates (more reliable than raw counts)
    if (source.stats.eventRate !== undefined && source.stats.seriousEventRate !== undefined) {
      confidence += 0.05 // 5% boost for having rate data
    }
    
    // Adjust based on event counts (more events = more reliable)
    if (source.stats.totalEvents !== undefined) {
      if (source.stats.totalEvents > 1000) {
        confidence += 0.05
      } else if (source.stats.totalEvents > 100) {
        confidence += 0.02
      } else if (source.stats.totalEvents < 10) {
        confidence -= 0.05 // Lower confidence for very few events
      }
    }
  }
  
  // Penalize if severity is "unknown"
  if (source.severity === "unknown") {
    confidence *= 0.7
  }
  
  // Cap confidence between 0 and 1
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Calculate overall confidence for merged sources (weighted average).
 */
export function calculateOverallConfidence(sources: InteractionSource[]): number {
  if (sources.length === 0) {
    return 0
  }
  
  // Calculate individual confidences
  const confidences = sources.map((source) => calculateConfidence(source))
  
  // Weighted average (sources with higher base confidence get more weight)
  let totalWeight = 0
  let weightedSum = 0
  
  for (let i = 0; i < sources.length; i++) {
    const weight = BASE_CONFIDENCE[sources[i].name] || 0.5
    totalWeight += weight
    weightedSum += confidences[i] * weight
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

