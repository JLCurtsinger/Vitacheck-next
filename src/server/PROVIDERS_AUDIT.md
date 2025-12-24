# Provider Audit Report

This document audits all server-side providers in the interaction checking pipeline, documenting their upstream endpoints, configuration, implementation status, and behavior.

## Overview

All providers are implemented in `src/server/providers/` and called from `src/server/orchestrator.ts`. Providers return `ProviderResponse<T>` which includes `data`, `error`, `cached`, and `timingMs` fields.

---

## 1. RxNorm Lookup

**File**: `src/server/providers/rxnorm.ts`  
**Function**: `lookupRxCUI(normalizedValue: string)`

### Upstream Endpoint
- **Base URL**: `https://rxnav.nlm.nih.gov/REST`
- **Path**: `/rxterms/rxcui?name={normalizedValue}`
- **Full URL Example**: `https://rxnav.nlm.nih.gov/REST/rxterms/rxcui?name=ibuprofen`
- **Method**: GET
- **Authentication**: None required (public API)

### Environment Variables
- None required

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to RxNav API
- Returns RxCUI identifier for medication names

### Success/Failure Behavior
- **Success**: Returns `{ data: { rxcui: string }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Handles HTTP errors, timeouts, and malformed responses gracefully

### Timeouts
- **Timeout**: `TIMEOUT_RXNORM_LOOKUP` = 6000ms (6 seconds)
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_UPSTREAM_CALLS = 6`

---

## 2. RxNorm Interactions

**File**: `src/server/providers/rxnorm.ts`  
**Function**: `getInteractions(rxcui1: string, rxcui2: string)`

### Upstream Endpoint
- **Base URL**: `https://rxnav.nlm.nih.gov/REST`
- **Path**: `/interaction/interaction.json?rxcui={rxcui1}&rxcui={rxcui2}`
- **Full URL Example**: `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=5640&rxcui=5640`
- **Method**: GET
- **Authentication**: None required (public API)

### Environment Variables
- None required

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to RxNav Interaction API
- Returns interaction severity and description for drug pairs

### Success/Failure Behavior
- **Success**: Returns `{ data: { severity: InteractionSeverity, description: string, source: "RxNorm" }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Parses nested RxNorm response structure (`interactionTypeGroup` → `interactionType` → `interactionPair`)

### Timeouts
- **Timeout**: `TIMEOUT_RXNORM_INTERACTIONS` = 10000ms (10 seconds)
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_PAIR_COMPUTATIONS = 3`

---

## 3. SUPP.AI Lookup

**File**: `src/server/providers/suppai.ts`  
**Function**: `lookupSuppAiId(normalizedValue: string)`

### Upstream Endpoint
- **Base URL**: `https://supp.ai/api`
- **Path**: `/search?q={normalizedValue}`
- **Full URL Example**: `https://supp.ai/api/search?q=ibuprofen`
- **Method**: GET
- **Authentication**: Bearer token required

### Environment Variables
- **Required**: `SUPPAI_API_KEY` (Bearer token)
- **Behavior if missing**: Returns `{ data: null, error: "SUPPAI_API_KEY not configured", cached: false, timingMs: number }`

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to SUPP.AI API (when API key is configured)
- Returns SUPP.AI identifier for medication/supplement names

### Success/Failure Behavior
- **Success**: Returns `{ data: { id: string }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Handles missing API key, HTTP errors, and malformed responses

### Timeouts
- **Timeout**: `TIMEOUT_SUPPAI` = 10000ms (10 seconds)
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_UPSTREAM_CALLS = 6`

---

## 4. SUPP.AI Interactions

**File**: `src/server/providers/suppai.ts`  
**Function**: `getInteractions(item1: string, item2: string, suppAiId1?: string, suppAiId2?: string)`

### Upstream Endpoint
- **Base URL**: `https://supp.ai/api`
- **Path**: 
  - If IDs available: `/interactions?id1={suppAiId1}&id2={suppAiId2}`
  - Otherwise: `/interactions?name1={item1}&name2={item2}`
- **Full URL Example**: `https://supp.ai/api/interactions?name1=ibuprofen&name2=aspirin`
- **Method**: GET
- **Authentication**: Bearer token required

### Environment Variables
- **Required**: `SUPPAI_API_KEY` (Bearer token)
- **Behavior if missing**: Returns `{ data: null, error: "SUPPAI_API_KEY not configured", cached: false, timingMs: number }`

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to SUPP.AI API (when API key is configured)
- Returns interaction data for medication/supplement pairs

### Success/Failure Behavior
- **Success**: Returns `{ data: { interactions: Array<{ severity, description }> }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Maps SUPP.AI severity strings to `InteractionSeverity` enum

### Timeouts
- **Timeout**: `TIMEOUT_SUPPAI` = 10000ms (10 seconds)
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_PAIR_COMPUTATIONS = 3`

---

## 5. openFDA Label

**File**: `src/server/providers/openfdaLabel.ts`  
**Function**: `fetchFdaLabel(normalizedValue: string, rxcui?: string)`

### Upstream Endpoint
- **Base URL**: `https://api.fda.gov/drug/label.json`
- **Path**: `?search={searchTerm}&limit=1`
- **Search Term**:
  - If RxCUI available: `openfda.rxcui:"{rxcui}"`
  - Otherwise: `"{normalizedValue}"`
- **Full URL Example**: `https://api.fda.gov/drug/label.json?search=openfda.rxcui:"5640"&limit=1`
- **Method**: GET
- **Authentication**: None required (public API)

### Environment Variables
- None required

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to openFDA API
- **Note**: Current implementation uses simple search which may return mismatched results (e.g., naproxen warnings for ibuprofen). See issue #3 in this audit.

### Success/Failure Behavior
- **Success**: Returns `{ data: { warnings: string[], productName?: string, rxcui?: string }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Extracts warnings array from openFDA response structure

### Timeouts
- **Timeout**: `TIMEOUT_FDA_LABEL` = 8000ms (8 seconds)
- **Retries**: `FDA_LABEL_MAX_RETRIES` = 2 retries with `FDA_LABEL_RETRY_BACKOFF_MS` = 500ms backoff

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_UPSTREAM_CALLS = 6`
- **Note**: openFDA has rate limits (typically 240 requests/minute), but no explicit handling in code

---

## 6. openFDA Adverse Events

**File**: `src/server/providers/openfdaEvents.ts`  
**Functions**: 
- `fetchAdverseEvents(normalizedValue1, normalizedValue2, rxcui1?, rxcui2?)` - for pairs
- `fetchSingleDrugAdverseEvents(normalizedValue, rxcui?)` - for single drugs

### Upstream Endpoint
- **Base URL**: `https://api.fda.gov/drug/event.json`
- **Path**: `?search={searchQuery}&count=serious.exact`
- **Search Query** (for pairs):
  - `(patient.drug.medicinalproduct:"{value1}" OR patient.drug.openfda.rxcui:"{rxcui1}") AND (patient.drug.medicinalproduct:"{value2}" OR patient.drug.openfda.rxcui:"{rxcui2}")`
- **Full URL Example**: `https://api.fda.gov/drug/event.json?search=(patient.drug.medicinalproduct:"ibuprofen" OR patient.drug.openfda.rxcui:"5640") AND (patient.drug.medicinalproduct:"warfarin" OR patient.drug.openfda.rxcui:"11289")&count=serious.exact`
- **Method**: GET
- **Authentication**: None required (public API)

### Environment Variables
- None required

### Implementation Status
- ✅ **NOT a stub** - Makes real HTTP calls to openFDA Adverse Events API
- Returns aggregated event counts and serious event counts

### Success/Failure Behavior
- **Success**: Returns `{ data: { totalEvents: number, seriousEvents: number, outcomes: Record<string, number> }, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Parses openFDA aggregation response structure

### Timeouts
- **Timeout**: `TIMEOUT_FDA_EVENTS` = 10000ms (10 seconds)
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_PAIR_COMPUTATIONS = 3`
- **Note**: openFDA has rate limits (typically 240 requests/minute), but no explicit handling in code

---

## 7. CMS Part D

**File**: `src/server/providers/cmsPartD.ts`  
**Function**: `fetchCmsPartDUsage(normalizedValue: string, rxcui?: string)`

### Upstream Endpoint
- **N/A** - Currently a stub

### Environment Variables
- None required

### Implementation Status
- ⚠️ **STUB** - Not implemented
- Returns `{ data: null, error: "CMS Part D dataset not yet integrated", cached: false, timingMs: number }`
- Checks cache first, but always returns null if not cached
- **TODO**: Implement actual CMS Part D lookup when dataset is available in Neon

### Success/Failure Behavior
- **Current**: Always returns `{ data: null, error: "CMS Part D dataset not yet integrated", cached: false, timingMs: number }`
- **Planned**: Should return `{ data: { beneficiaries: number, year?: number, sourceMeta?: Record<string, any> }, cached: boolean, timingMs: number }`

### Timeouts
- **Timeout**: `TIMEOUT_CMS_PARTD` = 4000ms (4 seconds) (defined but not used in stub)

### Rate Limiting/Concurrency
- No explicit rate limiting
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_UPSTREAM_CALLS = 6`

---

## 8. AI Literature

**File**: `src/server/providers/aiLiterature.ts`  
**Functions**: 
- `analyzeAiLiterature(itemA, itemB, evidenceBundle)` - analyzes evidence with OpenAI
- `fetchPubMedEvidence(itemA, itemB)` - fetches PubMed abstracts (stub)

### Upstream Endpoint (AI Analysis)
- **Base URL**: `https://api.openai.com/v1/chat/completions`
- **Path**: `/v1/chat/completions`
- **Method**: POST
- **Authentication**: Bearer token required

### Upstream Endpoint (PubMed - Stub)
- **N/A** - Currently a stub that returns empty array

### Environment Variables
- **Required**: `OPENAI_API_KEY` (Bearer token)
- **Behavior if missing**: Returns `{ data: null, error: "OPENAI_API_KEY not configured", cached: false, timingMs: number }`

### Implementation Status
- ✅ **NOT a stub** (AI analysis) - Makes real HTTP calls to OpenAI API when enabled
- ⚠️ **STUB** (PubMed) - `fetchPubMedEvidence` returns empty array, not implemented

### Success/Failure Behavior
- **Success**: Returns `{ data: InteractionSource, cached: false, timingMs: number }`
- **Failure**: Returns `{ data: null, error: string, cached: false, timingMs: number }`
- Uses `gpt-4o-mini` model with temperature 0.3, max 500 tokens
- Parses JSON response from OpenAI (handles markdown code blocks)

### Timeouts
- **Timeout**: `TIMEOUT_AI` = 30000ms (30 seconds) - hardcoded in provider
- **Retries**: None

### Rate Limiting/Concurrency
- No explicit rate limiting in provider code
- Concurrency controlled by orchestrator: `MAX_CONCURRENT_PAIR_COMPUTATIONS = 3`
- **Note**: OpenAI has rate limits, but no explicit handling in code
- **Cost Control**: Only called when `options.includeAi === true`, uses cheaper model, limited tokens

---

## Summary

| Provider | Status | Upstream Calls | Env Vars | Timeout | Retries |
|----------|--------|----------------|----------|---------|---------|
| RxNorm Lookup | ✅ Real | Yes | None | 6s | 0 |
| RxNorm Interactions | ✅ Real | Yes | None | 10s | 0 |
| SUPP.AI Lookup | ✅ Real* | Yes | `SUPPAI_API_KEY` | 10s | 0 |
| SUPP.AI Interactions | ✅ Real* | Yes | `SUPPAI_API_KEY` | 10s | 0 |
| openFDA Label | ✅ Real | Yes | None | 8s | 2 |
| openFDA Adverse Events | ✅ Real | Yes | None | 10s | 0 |
| CMS Part D | ⚠️ Stub | No | None | 4s | 0 |
| AI Literature | ✅ Real* | Yes | `OPENAI_API_KEY` | 30s | 0 |
| PubMed Evidence | ⚠️ Stub | No | None | N/A | 0 |

*Real when API key is configured, otherwise returns error

## Known Issues

1. **openFDA Label Matching**: Current implementation may return mismatched results (e.g., naproxen warnings for ibuprofen). Needs strict matching with post-filter.
2. **CMS Part D**: Not implemented - returns error message but doesn't block pipeline.
3. **PubMed Evidence**: Stub returns empty array - AI literature analysis works without it but could be enhanced.

## Recommendations

1. Implement strict matching for openFDA label provider (see issue #3).
2. Add explicit rate limiting for openFDA and OpenAI APIs.
3. Implement CMS Part D lookup when dataset is available.
4. Implement PubMed evidence fetching for AI literature analysis.

