# Interaction Checking API

## Overview

The interaction checking pipeline is a server-side system that orchestrates multiple third-party APIs to analyze drug interactions. All processing happens server-side with aggressive caching to minimize cost and latency.

## Endpoint

**POST** `/api/interactions/check`

## Request Format

```json
{
  "items": [
    {
      "value": "metformin",
      "display": "Metformin", // optional
      "type": "drug" // optional: "drug" | "supplement" | "unknown"
    },
    {
      "value": "ibuprofen"
    }
  ],
  "options": {
    "includeAi": false, // optional: enable AI literature analysis (default: false)
    "debug": false // optional: enable debug mode to see provider statuses (default: false)
  }
}
```

## Response Format

```json
{
  "items": [
    {
      "normalized": "metformin",
      "original": "metformin"
    },
    {
      "normalized": "ibuprofen",
      "original": "ibuprofen"
    }
  ],
  "results": {
    "singles": [
      {
        "itemName": "metformin",
        "safetySummary": "...",
        "sources": [...]
      }
    ],
    "pairs": [
      {
        "itemA": "metformin",
        "itemB": "ibuprofen",
        "severity": "moderate",
        "confidence": 0.75,
        "sources": [...],
        "summary": "...",
        "keyNotes": [...]
      }
    ],
    "triples": [
      {
        "items": ["metformin", "ibuprofen", "aspirin"],
        "severity": "moderate",
        "confidence": 0.70,
        "sources": [...],
        "summary": "...",
        "keyNotes": [...],
        "pairResults": [...]
      }
    ]
  },
  "meta": {
    "calcVersion": "v1.0.0",
    "cacheStats": {
      "medLookupHits": 2,
      "medLookupMisses": 0,
      "pairCacheHits": 1,
      "pairCacheMisses": 0,
      "cmsCacheHits": 0,
      "cmsCacheMisses": 2
    },
    "timing": {
      "totalMs": 1250,
      "lookupMs": 800,
      "pairProcessingMs": 400,
      "tripleProcessingMs": 50
    }
  },
  "debug": { // Only present if options.debug === true
    "providerStatuses": {
      "rxnorm-lookup-metformin": {
        "attempted": true,
        "ok": true,
        "ms": 245,
        "cached": false
      },
      "fda-label-ibuprofen": {
        "attempted": true,
        "ok": true,
        "ms": 312,
        "cached": false
      },
      "cms-partd-metformin": {
        "attempted": true,
        "ok": false,
        "ms": 1,
        "cached": false,
        "error": "not implemented"
      }
    },
    "rxcuiResolutions": {
      "metformin": "6809",
      "ibuprofen": "5640"
    }
  }
}
```

## Severity Levels

- `"none"`: No known interactions
- `"mild"`: Minor interactions, typically manageable
- `"moderate"`: Moderate interactions requiring monitoring or adjustment
- `"severe"`: Serious interactions requiring immediate attention
- `"unknown"`: Insufficient data to determine severity

## Testing

### Using curl

```bash
# Basic request
curl -X POST http://localhost:3000/api/interactions/check \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"value": "metformin"},
      {"value": "ibuprofen"}
    ]
  }'

# With debug mode
curl -X POST http://localhost:3000/api/interactions/check \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"value": "metformin"},
      {"value": "ibuprofen"}
    ],
    "options": {
      "debug": true
    }
  }'
```

### Using the test script

```bash
# Install tsx if needed: npm install -D tsx
npx tsx src/server/dev/testInteraction.ts
```

## Environment Variables

Required:
- `DATABASE_URL`: Neon Postgres connection string (pooled)

Optional:
- `SUPPAI_API_KEY`: SUPP.AI API key (if using SUPP.AI)
- `OPENAI_API_KEY`: OpenAI API key (if using AI literature analysis)

## Database Migrations

Run the migration SQL file in Neon SQL editor:

1. Open Neon Console
2. Navigate to SQL Editor
3. Run: `src/server/db/migrations/001_create_cache_tables.sql`

This creates:
- `med_lookup_cache`: Caches medication lookups (RxNorm, SUPP.AI, FDA label)
- `pair_interaction_cache`: Caches pair interaction results
- `cms_usage_cache`: Caches CMS Part D beneficiary counts
- `interaction_checks_log`: Optional logging table

## Cost Controls

1. **Caching**: All lookups and pair results are cached in Neon Postgres
2. **AI Conditional**: AI analysis is off by default (`includeAi: false`)
3. **AI Limits**: Maximum 1 OpenAI call per pair, uses `gpt-4o-mini`, limited tokens
4. **Concurrency Limits**: 
   - Max 6 concurrent upstream API calls
   - Max 3 concurrent pair computations
5. **Timeouts**: All API calls have timeouts to prevent hanging
6. **Graceful Degradation**: Provider failures don't crash the pipeline

## Architecture

- **Server-only modules**: All code under `src/server/` is server-only (marked with `"server-only"`)
- **Providers**: Third-party API clients in `src/server/providers/`
- **Logic**: Standardization, merging, consensus in `src/server/logic/`
- **Orchestrator**: Main pipeline in `src/server/orchestrator.ts`
- **API Route**: HTTP endpoint in `app/api/interactions/check/route.ts`

## Cache Invalidation

Cache is invalidated when `CALC_VERSION` changes (in `src/server/constants.ts`). Increment this version when logic changes to ensure fresh calculations.

