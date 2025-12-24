import "server-only"
import type { InteractionSource, InteractionSeverity } from "../../types"
import { getSourceWeight, isHighReliabilitySource } from "./weights"

/**
 * Calculate consensus severity from multiple sources using weighted voting.
 * 
 * Rules:
 * - "severe" requires either:
 *   - 1+ high-reliability source severe, OR
 *   - multiple independent sources reaching severe with sufficient combined weight
 * - If only low/medium sources indicate severe but high sources don't, downgrade to moderate
 */
export function calculateConsensusSeverity(sources: InteractionSource[]): InteractionSeverity {
  if (sources.length === 0) {
    return "unknown"
  }
  
  // Severity order for comparison
  const severityOrder: Record<InteractionSeverity, number> = {
    severe: 4,
    moderate: 3,
    mild: 2,
    none: 1,
    unknown: 0,
  }
  
  // Count weighted votes per severity
  const votes: Record<InteractionSeverity, number> = {
    severe: 0,
    moderate: 0,
    mild: 0,
    none: 0,
    unknown: 0,
  }
  
  let hasHighReliabilitySevere = false
  let hasHighReliabilityNonSevere = false
  
  for (const source of sources) {
    const weight = getSourceWeight(source.name)
    votes[source.severity] += weight
    
    if (isHighReliabilitySource(source.name)) {
      if (source.severity === "severe") {
        hasHighReliabilitySevere = true
      } else if (source.severity !== "unknown") {
        hasHighReliabilityNonSevere = true
      }
    }
  }
  
  // Rule: "severe" requires high-reliability source OR sufficient combined weight
  if (votes.severe > 0) {
    // Check if we have high-reliability severe
    if (hasHighReliabilitySevere) {
      return "severe"
    }
    
    // Check if we have sufficient combined weight (threshold: 1.5)
    if (votes.severe >= 1.5) {
      // But if high-reliability sources say otherwise, downgrade
      if (hasHighReliabilityNonSevere && votes.moderate > votes.severe * 0.8) {
        return "moderate"
      }
      return "severe"
    }
    
    // If only low/medium sources indicate severe but high sources don't, downgrade
    if (hasHighReliabilityNonSevere) {
      return "moderate"
    }
    
    // Otherwise, if we have some severe votes but not enough, check moderate
    if (votes.moderate > 0) {
      return "moderate"
    }
  }
  
  // Find highest voted severity (excluding severe if we didn't meet criteria)
  const candidates: InteractionSeverity[] = ["moderate", "mild", "none", "unknown"]
  let maxVotes = 0
  let consensus: InteractionSeverity = "unknown"
  
  for (const severity of candidates) {
    if (votes[severity] > maxVotes) {
      maxVotes = votes[severity]
      consensus = severity
    }
  }
  
  return consensus
}

