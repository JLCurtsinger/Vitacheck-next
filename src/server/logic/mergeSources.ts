import "server-only"
import type { InteractionSource } from "../types"

/**
 * Merge multiple InteractionSource objects by origin (name).
 * Groups by name, takes highest severity, averages confidence, merges details/citations.
 */
export function mergeSources(sources: InteractionSource[]): InteractionSource[] {
  if (sources.length === 0) {
    return []
  }
  
  // Group by name
  const grouped = new Map<string, InteractionSource[]>()
  
  for (const source of sources) {
    if (!grouped.has(source.name)) {
      grouped.set(source.name, [])
    }
    grouped.get(source.name)!.push(source)
  }
  
  // Merge each group
  const merged: InteractionSource[] = []
  
  for (const [name, groupSources] of grouped.entries()) {
    if (groupSources.length === 1) {
      merged.push(groupSources[0])
      continue
    }
    
    // Take highest severity
    const severityOrder: Record<string, number> = {
      severe: 4,
      moderate: 3,
      mild: 2,
      none: 1,
      unknown: 0,
    }
    
    const highestSeverity = groupSources.reduce((max, s) => {
      const currentOrder = severityOrder[s.severity] || 0
      const maxOrder = severityOrder[max.severity] || 0
      return currentOrder > maxOrder ? s : max
    }, groupSources[0])
    
    // Average confidence
    const avgConfidence =
      groupSources.reduce((sum, s) => sum + s.confidence, 0) / groupSources.length
    
    // Merge details (union of keys)
    const mergedDetails: Record<string, any> = {}
    for (const source of groupSources) {
      Object.assign(mergedDetails, source.details)
    }
    
    // Merge stats (take most complete)
    let mergedStats: InteractionSource["stats"] = undefined
    for (const source of groupSources) {
      if (source.stats) {
        if (!mergedStats) {
          mergedStats = {}
        }
        Object.assign(mergedStats, source.stats)
      }
    }
    
    // Union citations (unique)
    const citationsSet = new Set<string>()
    for (const source of groupSources) {
      if (source.citations) {
        for (const citation of source.citations) {
          citationsSet.add(citation)
        }
      }
    }
    
    // Combine summaries (take longest/most detailed)
    const longestSummary = groupSources.reduce((longest, s) =>
      s.summary.length > longest.summary.length ? s : longest,
      groupSources[0]
    )
    
    merged.push({
      name,
      severity: highestSeverity.severity,
      confidence: avgConfidence,
      summary: longestSummary.summary,
      details: mergedDetails,
      citations: citationsSet.size > 0 ? Array.from(citationsSet) : undefined,
      stats: mergedStats,
      lastUpdated: groupSources.reduce((latest, s) =>
        s.lastUpdated > latest.lastUpdated ? s : latest,
        groupSources[0]
      ).lastUpdated,
    })
  }
  
  return merged
}

