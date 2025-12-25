import "server-only"
import { normalizeInputItems, generatePairs, generateTriples, generatePairKey } from "./utils/normalize"
import { createLimiter } from "./utils/limit"
import { MAX_CONCURRENT_UPSTREAM_CALLS, MAX_CONCURRENT_PAIR_COMPUTATIONS } from "./constants"
import { lookupRxCUI, getInteractions as getRxNormInteractions } from "./providers/rxnorm"
import { lookupSuppAiId, getInteractions as getSuppAiInteractions } from "./providers/suppai"
import { fetchFdaLabel } from "./providers/openfdaLabel"
import { fetchAdverseEvents, fetchSingleDrugAdverseEvents } from "./providers/openfdaEvents"
import { fetchCmsPartDUsage } from "./providers/cmsPartD"
import { analyzeAiLiterature, fetchPubMedEvidence } from "./providers/aiLiterature"
import {
  getMedLookupCache,
  setMedLookupCache,
  getPairInteractionCache,
  setPairInteractionCache,
  getCmsUsageCache,
  logInteractionCheck,
} from "./db/cache"
import {
  standardizeRxNorm,
  standardizeSuppAi,
  standardizeFdaLabel,
  standardizeFdaAdverseEvents,
  standardizeSingleDrugAdverseEvents,
} from "./logic/standardize"
import { mergeSources } from "./logic/mergeSources"
import { calculateConsensusSeverity } from "./logic/consensus/calculateConsensus"
import { calculateOverallConfidence } from "./logic/confidence/calculateConfidence"
import type {
  InteractionCheckRequest,
  InteractionCheckResponse,
  InteractionResult,
  CombinedInteractionResult,
  IndividualResult,
  InteractionSource,
  ProviderStatus,
  DebugInfo,
} from "./types"
import { CALC_VERSION } from "./constants"

/**
 * Main orchestrator function for interaction checking.
 * Orchestrates all provider calls, caching, standardization, merging, and consensus.
 */
export async function checkInteractions(
  request: InteractionCheckRequest
): Promise<InteractionCheckResponse> {
  const startTime = Date.now()
  
  // Check for debug mode from request options or environment
  const debug = request.options?.debug === true || process.env.VITACHECK_DEBUG === '1'
  
  // Normalize input
  const normalizedItems = normalizeInputItems(request.items)
  
  // Debug logging
  if (debug) {
    const enabledProviders: string[] = []
    
    // RxNorm is always enabled (no key required)
    enabledProviders.push('rxnorm')
    
    // FDA Label is always enabled (no key required)
    enabledProviders.push('fda-label')
    
    // FDA Adverse Events is always enabled (no key required)
    enabledProviders.push('fda-adverse-events')
    
    // SUPP.AI requires API key
    if (process.env.SUPPAI_API_KEY) {
      enabledProviders.push('suppai')
    }
    
    // CMS is always enabled (no key required)
    enabledProviders.push('cms')
    
    // AI Literature requires explicit option
    if (request.options?.includeAi) {
      enabledProviders.push('ai-literature')
    }
    
    console.log('[orchestrator]', {
      itemCount: normalizedItems.length,
      enabledProviders,
    })
  }
  
  const cacheStats = {
    medLookupHits: 0,
    medLookupMisses: 0,
    pairCacheHits: 0,
    pairCacheMisses: 0,
    cmsCacheHits: 0,
    cmsCacheMisses: 0,
  }
  
  // Debug tracking
  const providerStatuses: Record<string, ProviderStatus> = {}
  const rxcuiResolutions: Record<string, string | null> = {}
  
  // Helper to track provider status
  const trackProviderStatus = (name: string, result: any, attempted: boolean = true) => {
    if (debug) {
      // For interactions providers, "no interactions found" (data: null, no error) is ok: true
      // For lookup providers, data: null typically means not found (ok: false)
      const isInteractionsProvider = name.includes("interactions")
      const ok = attempted && result && !result.error && (
        result.data !== null || (isInteractionsProvider && result.data === null && !result.error)
      )
      
      providerStatuses[name] = {
        attempted,
        ok,
        ms: result?.timingMs || 0,
        cached: result?.cached || false,
        error: result?.error,
      }
    }
  }
  
  // Concurrency limiters
  const upstreamLimiter = createLimiter(MAX_CONCURRENT_UPSTREAM_CALLS)
  const pairLimiter = createLimiter(MAX_CONCURRENT_PAIR_COMPUTATIONS)
  
  // Step 1: Medication lookups (parallel with caching)
  const lookupStartTime = Date.now()
  const medLookups = new Map<
    string,
    {
      rxnorm_rxcui?: string | null
      suppai_id?: string | null
      fda_label_warnings?: any
      fda_label_rxcui?: string | null
      cms_beneficiaries?: number | null
    }
  >()
  
  const forceRefresh = request.options?.forceRefresh === true
  
  await Promise.all(
    normalizedItems.map((item) =>
      upstreamLimiter(async () => {
        // Check cache (unless forceRefresh is true)
        const cached = await getMedLookupCache(item.normalized, forceRefresh)
        
        // Check if cached negative results are stale (older than 24 hours)
        let needsRxNormRefresh = false
        let needsSuppAiRefresh = false
        
        if (cached) {
          const updatedAt = new Date(cached.updated_at)
          const now = new Date()
          const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
          
          // Check if negative RxNorm result is stale
          if (cached.rxnorm_rxcui === null && hoursSinceUpdate > 24) {
            needsRxNormRefresh = true
          }
          
          // Check if negative SUPP.AI result is stale
          if (cached.suppai_id === null && hoursSinceUpdate > 24) {
            needsSuppAiRefresh = true
          }
        }
        
        if (cached && !needsRxNormRefresh && !needsSuppAiRefresh) {
          cacheStats.medLookupHits++
          medLookups.set(item.normalized, {
            rxnorm_rxcui: cached.rxnorm_rxcui,
            suppai_id: cached.suppai_id,
            fda_label_warnings: cached.fda_label_warnings,
            fda_label_rxcui: cached.fda_label_rxcui,
          })
          
          // Track cached provider statuses
          trackProviderStatus(`rxnorm-lookup-${item.normalized}`, {
            data: cached.rxnorm_rxcui ? { rxcui: cached.rxnorm_rxcui } : null,
            cached: true,
            timingMs: 0,
          })
          trackProviderStatus(`suppai-lookup-${item.normalized}`, {
            data: cached.suppai_id ? { id: cached.suppai_id } : null,
            cached: true,
            timingMs: 0,
          })
          trackProviderStatus(`fda-label-${item.normalized}`, {
            data: cached.fda_label_warnings ? { warnings: cached.fda_label_warnings, rxcui: cached.fda_label_rxcui } : null,
            cached: true,
            timingMs: 0,
          })
          
          // Track RxCUI resolution
          if (debug) {
            rxcuiResolutions[item.normalized] = cached.rxnorm_rxcui || null
          }
          
          // Also check CMS cache (only if includeCms is true)
          if (request.options?.includeCms) {
            const cmsCached = await getCmsUsageCache(item.normalized, forceRefresh)
            if (cmsCached && cmsCached.beneficiaries) {
              cacheStats.cmsCacheHits++
              medLookups.set(item.normalized, {
                ...medLookups.get(item.normalized)!,
                cms_beneficiaries: cmsCached.beneficiaries,
              })
              trackProviderStatus(`cms-partd-${item.normalized}`, {
                data: { beneficiaries: cmsCached.beneficiaries },
                cached: true,
                timingMs: 0,
              })
            } else {
              cacheStats.cmsCacheMisses++
              // Fetch CMS (non-blocking)
              const rxnormRxcui = cached?.rxnorm_rxcui || medLookups.get(item.normalized)?.rxnorm_rxcui || undefined
              const cmsResult = await fetchCmsPartDUsage(item.normalized, rxnormRxcui)
              trackProviderStatus(`cms-partd-${item.normalized}`, cmsResult)
              if (cmsResult.data) {
                medLookups.set(item.normalized, {
                  ...medLookups.get(item.normalized)!,
                  cms_beneficiaries: cmsResult.data.beneficiaries,
                })
              }
            }
          } else {
            // CMS not requested - mark as not attempted
            trackProviderStatus(`cms-partd-${item.normalized}`, null, false)
          }
          
          // If we need to refresh stale negative results, do it now
          if (needsRxNormRefresh || needsSuppAiRefresh) {
            const refreshPromises: Promise<any>[] = []
            if (needsRxNormRefresh) {
              refreshPromises.push(lookupRxCUI(item.normalized))
            } else {
              refreshPromises.push(Promise.resolve({ data: cached.rxnorm_rxcui ? { rxcui: cached.rxnorm_rxcui } : null, cached: false, timingMs: 0 }))
            }
            if (needsSuppAiRefresh) {
              refreshPromises.push(lookupSuppAiId(item.normalized))
            } else {
              refreshPromises.push(Promise.resolve({ data: cached.suppai_id ? { id: cached.suppai_id } : null, cached: false, timingMs: 0 }))
            }
            
            const [rxnormRefreshResult, suppaiRefreshResult] = await Promise.all(refreshPromises)
            
            // Update cache with refreshed results
            await setMedLookupCache(item.normalized, {
              rxnorm_rxcui: needsRxNormRefresh ? (rxnormRefreshResult.data?.rxcui || null) : cached.rxnorm_rxcui,
              suppai_id: needsSuppAiRefresh ? (suppaiRefreshResult.data?.id || null) : cached.suppai_id,
              fda_label_warnings: cached.fda_label_warnings,
              fda_label_rxcui: cached.fda_label_rxcui,
            })
            
            // Update in-memory cache
            medLookups.set(item.normalized, {
              rxnorm_rxcui: needsRxNormRefresh ? (rxnormRefreshResult.data?.rxcui || null) : cached.rxnorm_rxcui,
              suppai_id: needsSuppAiRefresh ? (suppaiRefreshResult.data?.id || null) : cached.suppai_id,
              fda_label_warnings: cached.fda_label_warnings,
              fda_label_rxcui: cached.fda_label_rxcui,
            })
            
            // Track refreshed provider statuses (with attempted:true and ms>0)
            if (needsRxNormRefresh) {
              trackProviderStatus(`rxnorm-lookup-${item.normalized}`, rxnormRefreshResult)
            }
            if (needsSuppAiRefresh) {
              trackProviderStatus(`suppai-lookup-${item.normalized}`, suppaiRefreshResult)
            }
            
            // Update RxCUI resolution if refreshed
            if (debug && needsRxNormRefresh) {
              rxcuiResolutions[item.normalized] = rxnormRefreshResult.data?.rxcui || null
            }
          }
          
          return
        }
        
        cacheStats.medLookupMisses++
        
        // Fetch all lookups in parallel (CMS only if includeCms is true)
        const lookupPromises: Promise<any>[] = [
          lookupRxCUI(item.normalized),
          lookupSuppAiId(item.normalized),
          fetchFdaLabel(item.normalized),
        ]
        
        if (request.options?.includeCms) {
          lookupPromises.push(fetchCmsPartDUsage(item.normalized))
        } else {
          lookupPromises.push(Promise.resolve({ data: null }))
        }
        
        const [rxnormResult, suppaiResult, fdaLabelResult, cmsResult] = await Promise.all(lookupPromises)
        
        // Track provider statuses
        trackProviderStatus(`rxnorm-lookup-${item.normalized}`, rxnormResult)
        trackProviderStatus(`suppai-lookup-${item.normalized}`, suppaiResult)
        trackProviderStatus(`fda-label-${item.normalized}`, fdaLabelResult)
        if (request.options?.includeCms) {
          trackProviderStatus(`cms-partd-${item.normalized}`, cmsResult)
        } else {
          trackProviderStatus(`cms-partd-${item.normalized}`, null, false)
        }
        
        // Track RxCUI resolution
        if (debug) {
          rxcuiResolutions[item.normalized] = rxnormResult.data?.rxcui || null
        }
        
        // Update cache
        await setMedLookupCache(item.normalized, {
          rxnorm_rxcui: rxnormResult.data?.rxcui || null,
          suppai_id: suppaiResult.data?.id || null,
          fda_label_warnings: fdaLabelResult.data?.warnings || null,
          fda_label_rxcui: fdaLabelResult.data?.rxcui || null,
        })
        
        // Store in memory
        medLookups.set(item.normalized, {
          rxnorm_rxcui: rxnormResult.data?.rxcui || null,
          suppai_id: suppaiResult.data?.id || null,
          fda_label_warnings: fdaLabelResult.data?.warnings || null,
          fda_label_rxcui: fdaLabelResult.data?.rxcui || null,
          cms_beneficiaries: request.options?.includeCms ? (cmsResult.data?.beneficiaries || null) : null,
        })
      })
    )
  )
  
  const lookupMs = Date.now() - lookupStartTime
  
  // Step 2: Process pairs
  const pairStartTime = Date.now()
  const pairs = generatePairs(normalizedItems)
  const pairResults = new Map<string, InteractionResult>()
  
  await Promise.all(
    pairs.map((pair) =>
      pairLimiter(async () => {
        const pairKey = generatePairKey(pair.a, pair.b)
        const pairKeyForDebug = `${pair.a}-${pair.b}`
        
        const lookupA = medLookups.get(pair.a)!
        const lookupB = medLookups.get(pair.b)!
        
        // Check cache (unless forceRefresh is true)
        const cached = await getPairInteractionCache(pairKey, forceRefresh)
        if (cached) {
          cacheStats.pairCacheHits++
          pairResults.set(pairKey, cached)
          
          // Track provider statuses for cached pairs (mark as cached)
          const cachedSources = Array.isArray(cached.sources) ? cached.sources : []
          if (lookupA.rxnorm_rxcui && lookupB.rxnorm_rxcui) {
            trackProviderStatus(`rxnorm-interactions-${pairKeyForDebug}`, {
              data: cachedSources.some((s: any) => s.name === "RxNorm") ? {} : null,
              cached: true,
              timingMs: 0,
            })
          } else {
            trackProviderStatus(`rxnorm-interactions-${pairKeyForDebug}`, null, false)
          }
          trackProviderStatus(`suppai-interactions-${pairKeyForDebug}`, {
            data: cachedSources.some((s: any) => s.name === "SUPP.AI") ? {} : null,
            cached: true,
            timingMs: 0,
          })
          trackProviderStatus(`fda-adverse-events-${pairKeyForDebug}`, {
            data: cachedSources.some((s: any) => s.name === "openFDA Adverse Events") ? {} : null,
            cached: true,
            timingMs: 0,
          })
          if (request.options?.includeAi) {
            trackProviderStatus(`ai-literature-${pairKeyForDebug}`, {
              data: cachedSources.some((s: any) => s.name === "AI Literature") ? {} : null,
              cached: true,
              timingMs: 0,
            })
          } else {
            trackProviderStatus(`ai-literature-${pairKeyForDebug}`, null, false)
          }
          return
        }
        
        cacheStats.pairCacheMisses++
        
        // Fetch all provider data in parallel
        const providerPromises: Promise<any>[] = []
        
        // RxNorm interactions (if both have RxCUI)
        if (lookupA.rxnorm_rxcui && lookupB.rxnorm_rxcui) {
          providerPromises.push(
            getRxNormInteractions(lookupA.rxnorm_rxcui, lookupB.rxnorm_rxcui)
          )
        } else {
          providerPromises.push(Promise.resolve({ data: null }))
        }
        
        // SUPP.AI interactions
        providerPromises.push(
          getSuppAiInteractions(pair.a, pair.b, lookupA.suppai_id || undefined, lookupB.suppai_id || undefined)
        )
        
        // FDA adverse events
        providerPromises.push(
          fetchAdverseEvents(
            pair.a,
            pair.b,
            lookupA.rxnorm_rxcui || undefined,
            lookupB.rxnorm_rxcui || undefined
          )
        )
        
        // AI literature (if requested)
        if (request.options?.includeAi) {
          const evidenceBundle = await fetchPubMedEvidence(pair.a, pair.b)
          providerPromises.push(analyzeAiLiterature(pair.a, pair.b, evidenceBundle))
        } else {
          providerPromises.push(Promise.resolve({ data: null }))
        }
        
        const [rxnormResult, suppaiResult, adverseEventsResult, aiResult] = await Promise.all(providerPromises)
        
        // Track provider statuses for pair
        if (lookupA.rxnorm_rxcui && lookupB.rxnorm_rxcui) {
          trackProviderStatus(`rxnorm-interactions-${pairKeyForDebug}`, rxnormResult)
        } else {
          trackProviderStatus(`rxnorm-interactions-${pairKeyForDebug}`, null, false)
        }
        trackProviderStatus(`suppai-interactions-${pairKeyForDebug}`, suppaiResult)
        trackProviderStatus(`fda-adverse-events-${pairKeyForDebug}`, adverseEventsResult)
        if (request.options?.includeAi) {
          trackProviderStatus(`ai-literature-${pairKeyForDebug}`, aiResult)
        } else {
          trackProviderStatus(`ai-literature-${pairKeyForDebug}`, null, false)
        }
        
        // Standardize all sources
        const sources: InteractionSource[] = []
        
        // Track which interaction providers were attempted and their success status
        const rxnormAttempted = lookupA.rxnorm_rxcui && lookupB.rxnorm_rxcui
        const rxnormOk = rxnormAttempted && !rxnormResult.error
        const suppaiAttempted = !!process.env.SUPPAI_API_KEY
        const suppaiOk = suppaiAttempted && !suppaiResult.error
        const adverseEventsAttempted = true // Always attempted
        const adverseEventsOk = !adverseEventsResult.error
        const aiAttempted = !!request.options?.includeAi
        const aiOk = aiAttempted && !aiResult.error
        
        if (rxnormResult.data) {
          const standardized = standardizeRxNorm(rxnormResult.data, pair.a, pair.b)
          if (standardized) sources.push(standardized)
        }
        
        if (suppaiResult.data) {
          const standardized = standardizeSuppAi(suppaiResult.data, pair.a, pair.b)
          sources.push(...standardized)
        }
        
        if (adverseEventsResult.data) {
          const standardized = standardizeFdaAdverseEvents(
            adverseEventsResult.data,
            pair.a,
            pair.b,
            lookupA.cms_beneficiaries || undefined,
            lookupB.cms_beneficiaries || undefined
          )
          if (standardized) sources.push(standardized)
        }
        
        if (aiResult.data) {
          sources.push(aiResult.data)
        }
        
        // Merge sources by origin
        const mergedSources = mergeSources(sources)
        
        // Calculate consensus severity
        let severity = calculateConsensusSeverity(mergedSources)
        
        // Check if RxNorm interactions was attempted and failed
        if (rxnormAttempted && !rxnormOk) {
          // RxNorm check failed - set severity to unknown, confidence to 0
          severity = "unknown"
        } else if (severity === "unknown" && mergedSources.length === 0) {
          // Only return severity "none" when sources.length === 0 AND all attempted providers returned ok:true
          const allAttemptedProvidersOk = [
            rxnormAttempted ? rxnormOk : true, // If not attempted, consider it "ok" (not required)
            suppaiAttempted ? suppaiOk : true,
            adverseEventsAttempted ? adverseEventsOk : true,
            aiAttempted ? aiOk : true,
          ].every(Boolean)
          
          if (allAttemptedProvidersOk) {
            // All attempted providers checked successfully but found no interactions
            severity = "none"
          }
        }
        
        // Calculate overall confidence
        let confidence = calculateOverallConfidence(mergedSources)
        
        // If RxNorm check failed, set confidence to 0
        if (rxnormAttempted && !rxnormOk) {
          confidence = 0
        } else if (severity === "none" && mergedSources.length === 0) {
          // Set baseline confidence based on which sources were successfully checked
          const checkedSources = []
          if (rxnormOk) checkedSources.push("RxNorm")
          if (suppaiOk) checkedSources.push("SUPP.AI")
          if (adverseEventsOk) checkedSources.push("openFDA Adverse Events")
          if (aiOk) checkedSources.push("AI Literature")
          
          // Baseline confidence: 0.3 for 1 source, 0.5 for 2+, 0.7 for 3+
          if (checkedSources.length >= 3) {
            confidence = 0.7
          } else if (checkedSources.length >= 2) {
            confidence = 0.5
          } else if (checkedSources.length >= 1) {
            confidence = 0.3
          }
        }
        
        // Build summary and key notes
        // Only return "No significant interactions found" if at least one primary source ran successfully
        // Primary sources: RxNorm interactions, openFDA pair events, SUPP.AI interactions
        const primarySourcesAttempted = [
          rxnormOk,
          adverseEventsOk,
          suppaiOk,
        ].filter(Boolean).length
        
        let summary: string
        if (mergedSources.length > 0) {
          summary = mergedSources[0].summary
        } else if (primarySourcesAttempted > 0) {
          // At least one primary source ran successfully and found no interactions
          summary = `No significant interactions found between ${pair.aOriginal} and ${pair.bOriginal}`
        } else {
          // No primary sources were attempted (missing identifiers or API keys)
          summary = `Limited evidence available for ${pair.aOriginal} and ${pair.bOriginal}. Could not confirm interactions due to unavailable sources.`
        }
        
        const keyNotes = mergedSources
          .slice(0, 3)
          .map((s) => s.summary.substring(0, 150))
          .filter((note) => note.length > 0)
        
        // Add keyNote if RxNorm check failed
        if (rxnormAttempted && !rxnormOk) {
          keyNotes.unshift("Interaction check failed: Unable to verify interactions through RxNorm database.")
        }
        
        const result: InteractionResult = {
          itemA: pair.aOriginal,
          itemB: pair.bOriginal,
          severity,
          confidence,
          sources: mergedSources,
          summary,
          keyNotes,
        }
        
        // Cache result
        await setPairInteractionCache(pairKey, pair.a, pair.b, result)
        
        pairResults.set(pairKey, result)
      })
    )
  )
  
  const pairProcessingMs = Date.now() - pairStartTime
  
  // Step 3: Process singles (FDA label warnings + CMS context)
  const singles: IndividualResult[] = await Promise.all(
    normalizedItems.map(async (item) => {
      const lookup = medLookups.get(item.normalized)!
      
      // Get FDA label if available
      let fdaSource: InteractionSource | null = null
      if (lookup.fda_label_warnings) {
        fdaSource = standardizeFdaLabel(
          {
            warnings: Array.isArray(lookup.fda_label_warnings)
              ? lookup.fda_label_warnings
              : [String(lookup.fda_label_warnings)],
            rxcui: lookup.fda_label_rxcui || undefined,
          },
          item.normalized
        )
      }
      
      // Get single drug adverse events (optional, non-blocking)
      let adverseSource: InteractionSource | null = null
      try {
        const adverseResult = await fetchSingleDrugAdverseEvents(
          item.normalized,
          lookup.rxnorm_rxcui || undefined
        )
        trackProviderStatus(`fda-adverse-events-single-${item.normalized}`, adverseResult)
        if (adverseResult.data) {
          adverseSource = standardizeSingleDrugAdverseEvents(
            adverseResult.data,
            item.normalized,
            lookup.cms_beneficiaries || undefined
          )
        }
      } catch (error) {
        // Non-blocking
        if (debug) {
          trackProviderStatus(`fda-adverse-events-single-${item.normalized}`, {
            error: error instanceof Error ? error.message : String(error),
            timingMs: 0,
            cached: false,
          })
        }
      }
      
      const sources: InteractionSource[] = []
      if (fdaSource) sources.push(fdaSource)
      if (adverseSource) sources.push(adverseSource)
      
      const safetySummary =
        sources.length > 0
          ? sources.map((s) => s.summary).join(" ")
          : `No specific safety warnings found for ${item.original}`
      
      return {
        itemName: item.original,
        safetySummary,
        sources,
      }
    })
  )
  
  // Step 4: Process triples (aggregate pair results)
  const tripleStartTime = Date.now()
  const triplesData = generateTriples(normalizedItems, pairResults)
  const triples: CombinedInteractionResult[] = triplesData.map((triple) => {
    // Get pair results for this triple
    const triplePairResults: InteractionResult[] = []
    for (const pairKey of triple.pairs) {
      const pairResult = pairResults.get(pairKey)
      if (pairResult) {
        triplePairResults.push(pairResult)
      }
    }
    
    // Merge all sources from pair results
    const allSources: InteractionSource[] = []
    for (const pairResult of triplePairResults) {
      allSources.push(...pairResult.sources)
    }
    
    const mergedSources = mergeSources(allSources)
    const severity = calculateConsensusSeverity(mergedSources)
    const confidence = calculateOverallConfidence(mergedSources)
    
    const summary =
      mergedSources.length > 0
        ? `Combined analysis of ${triple.items.join(", ")}: ${mergedSources[0].summary}`
        : `No significant interactions found for ${triple.items.join(", ")}`
    
    const keyNotes = mergedSources
      .slice(0, 3)
      .map((s) => s.summary.substring(0, 150))
      .filter((note) => note.length > 0)
    
    return {
      items: triple.items,
      severity,
      confidence,
      sources: mergedSources,
      summary,
      keyNotes,
      pairResults: triplePairResults,
    }
  })
  
  const tripleProcessingMs = Date.now() - tripleStartTime
  
  // Build response
  const totalMs = Date.now() - startTime
  
  const response: InteractionCheckResponse = {
    items: normalizedItems.map((item) => ({
      normalized: item.normalized,
      original: item.original,
    })),
    results: {
      singles,
      pairs: Array.from(pairResults.values()),
      triples,
    },
    meta: {
      calcVersion: CALC_VERSION,
      cacheStats,
      timing: {
        totalMs,
        lookupMs,
        pairProcessingMs,
        tripleProcessingMs,
      },
    },
  }
  
  // Add debug info if requested
  if (debug) {
    const debugInfo: DebugInfo = {
      providerStatuses,
    }
    if (Object.keys(rxcuiResolutions).length > 0) {
      debugInfo.rxcuiResolutions = rxcuiResolutions
    }
    response.debug = debugInfo
  }
  
  // Log (non-blocking)
  const firstPair = pairResults.size > 0 ? Array.from(pairResults.values())[0] : undefined
  logInteractionCheck(
    request.items,
    {
      severity: triples.length > 0 ? triples[0].severity : firstPair?.severity ?? "unknown",
      confidence: triples.length > 0 ? triples[0].confidence : firstPair?.confidence ?? 0,
      sourceCount: triples.length > 0 ? triples[0].sources.length : firstPair?.sources.length ?? 0,
    },
    totalMs,
    cacheStats
  ).catch(() => {
    // Ignore logging errors
  })
  
  return response
}

