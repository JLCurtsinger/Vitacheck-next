import "server-only"
import type {
  InteractionSource,
  RxNormInteractionResult,
  SuppAiResult,
  FdaLabelResult,
  FdaAdverseEventsResult,
  CmsPartDResult,
} from "../types"
import { BASE_CONFIDENCE } from "../constants"

/**
 * Standardize provider outputs into InteractionSource[] format.
 */

export function standardizeRxNorm(
  result: RxNormInteractionResult | null,
  itemA: string,
  itemB: string
): InteractionSource | null {
  if (!result || (!result.severity && !result.description)) {
    return null
  }
  
  return {
    name: "RxNorm",
    severity: result.severity || "unknown",
    confidence: BASE_CONFIDENCE["RxNorm"],
    summary: result.description || `Interaction between ${itemA} and ${itemB} reported in RxNorm`,
    details: {
      source: result.source || "RxNorm",
      description: result.description,
    },
    citations: result.source ? [`https://rxnav.nlm.nih.gov`] : undefined,
    lastUpdated: new Date().toISOString(),
  }
}

export function standardizeSuppAi(
  result: SuppAiResult | null,
  itemA: string,
  itemB: string
): InteractionSource[] {
  if (!result || !result.interactions || result.interactions.length === 0) {
    return []
  }
  
  return result.interactions.map((interaction, index) => ({
    name: "SUPP.AI",
    severity: interaction.severity || "unknown",
    confidence: BASE_CONFIDENCE["SUPP.AI"],
    summary: interaction.description || `Interaction between ${itemA} and ${itemB} reported in SUPP.AI`,
    details: {
      description: interaction.description,
      index,
    },
    citations: [`https://supp.ai`],
    lastUpdated: new Date().toISOString(),
  }))
}

export function standardizeFdaLabel(
  result: FdaLabelResult | null,
  item: string
): InteractionSource | null {
  if (!result || !result.warnings || result.warnings.length === 0) {
    return null
  }
  
  // Combine all warnings into summary
  const summary = result.warnings.join("; ")
  
  return {
    name: "FDA Label",
    severity: "moderate", // FDA label warnings are typically moderate unless explicitly severe
    confidence: BASE_CONFIDENCE["FDA Label"],
    summary: `FDA label warnings for ${item}: ${summary.substring(0, 200)}`,
    details: {
      warnings: result.warnings,
      productName: result.productName,
      rxcui: result.rxcui,
    },
    citations: result.rxcui ? [`https://www.fda.gov/drugs`] : undefined,
    lastUpdated: new Date().toISOString(),
  }
}

export function standardizeFdaAdverseEvents(
  result: FdaAdverseEventsResult | null,
  itemA: string,
  itemB: string,
  beneficiariesA?: number,
  beneficiariesB?: number
): InteractionSource | null {
  if (!result || result.totalEvents === 0) {
    return null
  }
  
  // Calculate exposure denominator for pair
  // Use conservative min(benefA, benefB) as proxy for co-use
  let beneficiaries: number | undefined
  let denominatorMethod: string | undefined
  
  if (beneficiariesA && beneficiariesB) {
    beneficiaries = Math.min(beneficiariesA, beneficiariesB)
    denominatorMethod = "min_of_pair"
  } else if (beneficiariesA) {
    beneficiaries = beneficiariesA
    denominatorMethod = "single_drug_a"
  } else if (beneficiariesB) {
    beneficiaries = beneficiariesB
    denominatorMethod = "single_drug_b"
  }
  
  // Calculate rates if beneficiaries available
  let eventRate: number | undefined
  let seriousEventRate: number | undefined
  
  if (beneficiaries && beneficiaries > 0) {
    eventRate = result.totalEvents / beneficiaries
    seriousEventRate = result.seriousEvents / beneficiaries
  }
  
  // Determine severity based on event counts and rates
  let severity: "none" | "mild" | "moderate" | "severe" | "unknown" = "unknown"
  
  if (result.seriousEvents > 1000) {
    severity = "severe"
  } else if (result.seriousEvents > 100) {
    severity = "moderate"
  } else if (result.totalEvents > 0) {
    severity = "mild"
  }
  
  // Adjust based on rates if available
  if (seriousEventRate !== undefined) {
    if (seriousEventRate > 0.01) {
      severity = "severe"
    } else if (seriousEventRate > 0.001) {
      severity = "moderate"
    }
  }
  
  const summary = `Adverse event reports for ${itemA} + ${itemB}: ${result.totalEvents} total events, ${result.seriousEvents} serious events${beneficiaries ? ` (exposure: ${beneficiaries.toLocaleString()} beneficiaries)` : ""}`
  
  return {
    name: "openFDA Adverse Events",
    severity,
    confidence: BASE_CONFIDENCE["openFDA Adverse Events"], // Will be adjusted by confidence calculator
    summary,
    details: {
      totalEvents: result.totalEvents,
      seriousEvents: result.seriousEvents,
      outcomes: result.outcomes,
    },
    stats: {
      totalEvents: result.totalEvents,
      seriousEventCounts: result.seriousEvents,
      beneficiaries,
      eventRate,
      seriousEventRate,
      denominatorMethod,
    },
    citations: [`https://open.fda.gov`],
    lastUpdated: new Date().toISOString(),
  }
}

export function standardizeSingleDrugAdverseEvents(
  result: FdaAdverseEventsResult | null,
  item: string,
  beneficiaries?: number
): InteractionSource | null {
  if (!result || result.totalEvents === 0) {
    return null
  }
  
  let eventRate: number | undefined
  let seriousEventRate: number | undefined
  
  if (beneficiaries && beneficiaries > 0) {
    eventRate = result.totalEvents / beneficiaries
    seriousEventRate = result.seriousEvents / beneficiaries
  }
  
  const summary = `Adverse event reports for ${item}: ${result.totalEvents} total events, ${result.seriousEvents} serious events${beneficiaries ? ` (exposure: ${beneficiaries.toLocaleString()} beneficiaries)` : ""}`
  
  return {
    name: "openFDA Adverse Events",
    severity: "unknown", // Single drug events don't indicate interaction severity
    confidence: BASE_CONFIDENCE["openFDA Adverse Events"],
    summary,
    details: {
      totalEvents: result.totalEvents,
      seriousEvents: result.seriousEvents,
      outcomes: result.outcomes,
    },
    stats: {
      totalEvents: result.totalEvents,
      seriousEventCounts: result.seriousEvents,
      beneficiaries,
      eventRate,
      seriousEventRate,
    },
    citations: [`https://open.fda.gov`],
    lastUpdated: new Date().toISOString(),
  }
}

