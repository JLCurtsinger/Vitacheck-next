# Interaction Checking Pipeline - Implementation Summary

## Overview

A complete server-side interaction checking pipeline has been implemented to replace client-orchestrated API calls. All processing happens server-side with aggressive caching, concurrency control, and cost optimization.

## Files Created

### Server Core
- `src/server/types.ts` - Core TypeScript types for the pipeline
- `src/server/constants.ts` - Configuration constants (CALC_VERSION, timeouts, weights, etc.)
- `src/server/orchestrator.ts` - Main pipeline orchestrator

### Utilities
- `src/server/utils/limit.ts` - Concurrency limiter (pLimit pattern)
- `src/server/utils/timeout.ts` - Fetch timeout and retry utilities
- `src/server/utils/normalize.ts` - Input normalization and pair/triple generation

### Database
- `src/server/db/pool.ts` - Neon Postgres pool singleton
- `src/server/db/query.ts` - Query helper function
- `src/server/db/cache.ts` - Cache operations (get/set for all cache tables)
- `src/server/db/migrations/001_create_cache_tables.sql` - Database migration SQL

### Providers (Third-party API clients)
- `src/server/providers/rxnorm.ts` - RxNorm lookup and interactions
- `src/server/providers/suppai.ts` - SUPP.AI lookup and interactions
- `src/server/providers/openfdaLabel.ts` - FDA label warnings (with retry)
- `src/server/providers/openfdaEvents.ts` - FDA adverse events (single and pair)
- `src/server/providers/cmsPartD.ts` - CMS Part D usage (stub, ready for integration)
- `src/server/providers/aiLiterature.ts` - Optional AI literature analysis

### Logic
- `src/server/logic/standardize.ts` - Standardize provider outputs to InteractionSource[]
- `src/server/logic/mergeSources.ts` - Merge sources by origin
- `src/server/logic/consensus/weights.ts` - Source reliability weights
- `src/server/logic/consensus/calculateConsensus.ts` - Weighted consensus severity
- `src/server/logic/confidence/calculateConfidence.ts` - Confidence calculation with CMS integration

### API & Client
- `app/api/interactions/check/route.ts` - Main HTTP endpoint
- `src/lib/apiTypes.ts` - Client-facing type definitions
- `src/server/dev/testInteraction.ts` - Test script

### Documentation
- `INTERACTION_API.md` - API documentation
- `IMPLEMENTATION_SUMMARY.md` - This file

## Database Schema

### Tables Created

1. **med_lookup_cache**
   - Caches medication lookups (RxNorm RxCUI, SUPP.AI ID, FDA label warnings)
   - Primary key: `normalized_value`
   - Indexes: primary key, `updated_at`

2. **pair_interaction_cache**
   - Caches complete pair interaction results
   - Primary key: `pair_key` (sorted normalized values joined with `::`)
   - Indexes: primary key, `a_value`, `b_value`, `calc_version`

3. **cms_usage_cache**
   - Caches CMS Part D beneficiary counts
   - Primary key: `normalized_value`
   - Indexes: primary key, `updated_at`

4. **interaction_checks_log**
   - Optional logging table for analytics
   - Primary key: `id` (UUID)
   - Indexes: primary key, `created_at`

## Migration Instructions

1. Open Neon Console (https://console.neon.tech)
2. Navigate to your project
3. Open SQL Editor
4. Copy and paste contents of `src/server/db/migrations/001_create_cache_tables.sql`
5. Execute the migration

## Environment Variables

### Required
- `DATABASE_URL` - Neon Postgres pooled connection string

### Optional
- `SUPPAI_API_KEY` - SUPP.AI API key (if using SUPP.AI provider)
- `OPENAI_API_KEY` - OpenAI API key (if using AI literature analysis)

## Testing

### Using curl
```bash
curl -X POST http://localhost:3000/api/interactions/check \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"value": "metformin"},
      {"value": "ibuprofen"}
    ]
  }'
```

### Using test script
```bash
# Install tsx if needed
npm install -D tsx

# Run test
npx tsx src/server/dev/testInteraction.ts
```

## Key Features

### 1. Server-Only Architecture
- All server modules marked with `"server-only"` import
- Prevents accidental client-side imports
- Uses Node.js runtime (not Edge)

### 2. Concurrency Control
- Max 6 concurrent upstream API calls
- Max 3 concurrent pair computations
- Prevents overwhelming upstream APIs

### 3. Timeouts & Retries
- RxNorm lookup: 6s timeout
- RxNorm interactions: 10s timeout
- SUPP.AI: 10s timeout
- FDA label: 8s timeout, 2 retries with 500ms backoff
- FDA adverse events: 10s timeout, no retry
- CMS Part D: 4s timeout

### 4. Aggressive Caching
- Medication lookups cached (RxNorm, SUPP.AI, FDA label)
- Pair interaction results cached
- CMS usage cached
- Cache invalidated by `CALC_VERSION` (increment when logic changes)

### 5. Standardization
- All provider outputs standardized to `InteractionSource[]`
- Consistent structure across all sources
- Includes severity, confidence, summary, details, citations, stats

### 6. Source Merging
- Sources grouped by origin (name)
- Highest severity taken
- Confidence averaged
- Details and citations merged

### 7. Weighted Consensus
- Source reliability weights:
  - RxNorm: 1.0 (high)
  - FDA Label: 0.9 (high)
  - SUPP.AI: 0.6 (medium)
  - openFDA Adverse Events: 0.7 (medium)
  - AI Literature: 0.5 (medium)
- "Severe" requires high-reliability source OR sufficient combined weight
- Low/medium sources alone cannot result in "severe" if high sources disagree

### 8. Confidence Calculation (First-Class Output)
- **Definition:** Confidence reflects evidence robustness, completeness, and consistency (separate from severity)
- **Base confidence per source type:**
  - RxNorm: 0.85, FDA Label: 0.80, SUPP.AI: 0.70, openFDA: 0.65, AI Literature: 0.60
- **Adjustments based on evidence quality/quantity:**
  - CMS beneficiary counts boost confidence (logarithmic, capped at 15%)
  - Event rates boost confidence (5% boost when available)
  - Event counts adjust confidence (more events = more reliable, very few = penalty)
  - "Unknown" severity penalizes confidence (×0.7 multiplier)
- **Overall confidence:** Weighted average of per-source confidences (sources with higher base confidence get more weight)
- **Guardrails:** Never show 100% confidence (cap at 0.95), conflicting evidence reduces confidence, missing primary sources reduce confidence
- **See `api-orchestration.md` section 5.1 for complete confidence requirements**

### 9. CMS Part D Integration
- Stub implementation ready for integration
- When CMS data available:
  - Use `min(benefA, benefB)` as conservative denominator for pairs
  - Calculate event rates: `totalEvents / beneficiaries`
  - Boost confidence based on exposure size
- Currently returns null without blocking pipeline

### 10. AI Literature Analysis
- Optional (off by default)
- Maximum 1 OpenAI call per pair
- Uses `gpt-4o-mini` for cost control
- Limited to 500 tokens
- Never sole source for "severe" (enforced in consensus)
- Cached by pair_key + calc_version + prompt_hash

### 11. Graceful Degradation
- Provider failures don't crash pipeline
- Missing data handled gracefully
- Cache misses fall back to API calls
- Errors logged but not exposed to client

## Cost Controls

1. **Caching**: Reduces redundant API calls
2. **AI Conditional**: Off by default, requires `includeAi: true`
3. **AI Limits**: 1 call per pair max, cheaper model, token limits
4. **Concurrency Limits**: Prevents excessive parallel calls
5. **Timeouts**: Prevents hanging requests
6. **Graceful Degradation**: Continues with partial data

## Response Format

The API returns a structured response with:
- Normalized items
- Results: singles, pairs, triples
- Metadata: calc version, cache stats, timing

See `INTERACTION_API.md` for full API documentation.

## Next Steps

1. **Run Migration**: Execute SQL migration in Neon Console
2. **Set Environment Variables**: Add `DATABASE_URL` (and optional API keys)
3. **Test Endpoint**: Use curl or test script to verify functionality
4. **Wire UI**: Update frontend to call `/api/interactions/check`
5. **Integrate CMS**: When CMS Part D dataset is available, update `cmsPartD.ts`
6. **Monitor**: Check cache hit rates and adjust cache TTLs if needed

## Notes

- All server code is in `src/server/` and marked with `"server-only"`
- Client-facing types are in `src/lib/apiTypes.ts`
- No UI changes were made (as requested)
- CMS Part D is stubbed but ready for integration
- AI is optional and cost-controlled
- Cache versioning allows safe invalidation when logic changes

