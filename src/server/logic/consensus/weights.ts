import "server-only"
import { SOURCE_WEIGHTS } from "../../constants"

/**
 * Source reliability weights for consensus calculation.
 */

export function getSourceWeight(sourceName: string): number {
  return SOURCE_WEIGHTS[sourceName] || 0.5 // default medium weight
}

export function isHighReliabilitySource(sourceName: string): boolean {
  return getSourceWeight(sourceName) >= 0.8
}

export function isMediumReliabilitySource(sourceName: string): boolean {
  const weight = getSourceWeight(sourceName)
  return weight >= 0.5 && weight < 0.8
}

export function isLowReliabilitySource(sourceName: string): boolean {
  return getSourceWeight(sourceName) < 0.5
}

