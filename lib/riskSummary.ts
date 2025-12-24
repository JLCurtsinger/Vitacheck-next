import { type PairResult, type InteractionSeverity } from "./mockResults"

export interface TopRiskItem {
  headline: string
  severity: InteractionSeverity
  pairLabel: string
  targetId: string
}

/**
 * Extracts a headline from a pair interaction description.
 * Looks for patterns like "risk of", "can cause", "may cause", etc.
 */
export function extractHeadline(description: string): string {
  const lowerDesc = description.toLowerCase()
  
  // Patterns to look for (in order of preference)
  const patterns = [
    /risk of\s+([^.,]+)/i,
    /can cause\s+([^.,]+)/i,
    /may cause\s+([^.,]+)/i,
    /can lead to\s+([^.,]+)/i,
    /associated with\s+([^.,]+)/i,
  ]
  
  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      let headline = match[1].trim()
      // Remove trailing punctuation
      headline = headline.replace(/[.,;:]+$/, "")
      return headline
    }
  }
  
  // Fallback: use first sentence, clean it up
  let fallback = description.split(/[.!?]/)[0].trim()
  
  // Remove common leading phrases
  fallback = fallback.replace(/^(taking these together|this combination|combining these)\s+/i, "")
  fallback = fallback.replace(/^(may|can|might)\s+/i, "")
  
  // Limit length
  if (fallback.length > 60) {
    const words = fallback.split(/\s+/)
    let truncated = ""
    for (const word of words) {
      if ((truncated + " " + word).length > 60) break
      truncated += (truncated ? " " : "") + word
    }
    fallback = truncated
  }
  
  // Remove trailing punctuation
  fallback = fallback.replace(/[.,;:]+$/, "")
  
  return fallback || description.substring(0, 60)
}

/**
 * Normalizes common outcome variations to a standard form.
 */
export function normalizeHeadline(headline: string): string {
  const lower = headline.toLowerCase().trim()
  
  const synonymMap: Record<string, string> = {
    "gi bleeding": "Gastrointestinal bleeding",
    "gastrointestinal bleeding": "Gastrointestinal bleeding",
    "serotonin toxicity": "Serotonin syndrome",
    "serotonin syndrome": "Serotonin syndrome",
  }
  
  // Check for exact matches first
  if (synonymMap[lower]) {
    return synonymMap[lower]
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(synonymMap)) {
    if (lower.includes(key)) {
      return value
    }
  }
  
  // Convert to Title Case if not found in map
  return headline
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Builds the top risks list from pair interactions.
 * Groups by normalized headline, ranks by severity and count, returns top 3.
 */
export function buildTopRisks(pairInteractions: PairResult[]): TopRiskItem[] {
  // Group by normalized headline
  const groups = new Map<string, PairResult[]>()
  
  for (const pair of pairInteractions) {
    const headline = extractHeadline(pair.whatThisMeans)
    const normalized = normalizeHeadline(headline)
    
    if (!groups.has(normalized)) {
      groups.set(normalized, [])
    }
    groups.get(normalized)!.push(pair)
  }
  
  // Convert to array and rank
  const rankedGroups = Array.from(groups.entries()).map(([normalizedHeadline, pairs]) => {
    // Get severity order (severe=3, moderate=2, minor=1)
    const severityOrder = (s: InteractionSeverity) => {
      if (s === "severe") return 3
      if (s === "moderate") return 2
      return 1
    }
    
    // Find highest severity in group
    const maxSeverity = pairs.reduce((max, p) => 
      severityOrder(p.severity) > severityOrder(max) ? p.severity : max,
      pairs[0].severity
    )
    
    // Pick representative item (highest severity, or first if tie)
    const representative = pairs.find(p => p.severity === maxSeverity) || pairs[0]
    
    return {
      normalizedHeadline,
      pairs,
      count: pairs.length,
      maxSeverity,
      representative,
    }
  })
  
  // Sort: by severity (desc), then by count (desc)
  rankedGroups.sort((a, b) => {
    const severityA = a.maxSeverity === "severe" ? 3 : a.maxSeverity === "moderate" ? 2 : 1
    const severityB = b.maxSeverity === "severe" ? 3 : b.maxSeverity === "moderate" ? 2 : 1
    
    if (severityA !== severityB) {
      return severityB - severityA
    }
    
    return b.count - a.count
  })
  
  // Take top 3 and convert to TopRiskItem format
  return rankedGroups.slice(0, 3).map((group) => ({
    headline: group.normalizedHeadline,
    severity: group.representative.severity,
    pairLabel: `${group.representative.itemA} + ${group.representative.itemB}`,
    targetId: group.representative.id,
  }))
}

