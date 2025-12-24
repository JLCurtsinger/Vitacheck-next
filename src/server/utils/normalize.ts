import "server-only"

/**
 * Input normalization utilities for medication names.
 */

/**
 * Normalizes a medication name to a canonical value for caching and matching.
 * - trim, lowercase
 * - collapse whitespace
 * - keep slashes for combo drugs but normalize spacing around /
 */
export function normalizeMedicationValue(value: string): string {
  let normalized = value.trim().toLowerCase()
  
  // Normalize spacing around slashes (e.g., "metformin / sitagliptin" -> "metformin/sitagliptin")
  normalized = normalized.replace(/\s*\/\s*/g, "/")
  
  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, " ")
  
  return normalized.trim()
}

/**
 * Generates a pair key from two normalized values (sorted).
 */
export function generatePairKey(a: string, b: string): string {
  const normalizedA = normalizeMedicationValue(a)
  const normalizedB = normalizeMedicationValue(b)
  
  // Sort to ensure consistent key regardless of input order
  const [first, second] = [normalizedA, normalizedB].sort()
  
  return `${first}::${second}`
}

/**
 * Validates and normalizes input items.
 */
export function normalizeInputItems(
  items: Array<{ value: string; display?: string; type?: string }>
): Array<{ normalized: string; original: string }> {
  if (items.length === 0) {
    throw new Error("At least one item is required")
  }
  
  if (items.length > 10) {
    throw new Error(`Maximum ${10} items allowed per request`)
  }
  
  return items.map((item) => ({
    normalized: normalizeMedicationValue(item.value),
    original: item.value,
  }))
}

/**
 * Generates all unique pairs from normalized items.
 */
export function generatePairs(
  items: Array<{ normalized: string; original: string }>
): Array<{ a: string; b: string; aOriginal: string; bOriginal: string }> {
  const pairs: Array<{ a: string; b: string; aOriginal: string; bOriginal: string }> = []
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({
        a: items[i].normalized,
        b: items[j].normalized,
        aOriginal: items[i].original,
        bOriginal: items[j].original,
      })
    }
  }
  
  return pairs
}

/**
 * Generates triples by aggregating pair results (no new upstream calls).
 */
export function generateTriples(
  items: Array<{ normalized: string; original: string }>,
  pairResults: Map<string, any>
): Array<{ items: string[]; pairs: string[] }> {
  if (items.length < 3) {
    return []
  }
  
  const triples: Array<{ items: string[]; pairs: string[] }> = []
  
  // Generate all unique triple combinations
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (let k = j + 1; k < items.length; k++) {
        const tripleItems = [
          items[i].normalized,
          items[j].normalized,
          items[k].normalized,
        ]
        
        // Get all pairs within this triple
        const triplePairs = [
          generatePairKey(items[i].normalized, items[j].normalized),
          generatePairKey(items[i].normalized, items[k].normalized),
          generatePairKey(items[j].normalized, items[k].normalized),
        ]
        
        triples.push({
          items: tripleItems,
          pairs: triplePairs,
        })
      }
    }
  }
  
  return triples
}

