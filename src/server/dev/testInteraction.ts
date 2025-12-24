/**
 * Test script for interaction checking pipeline.
 * Run with: npx tsx src/server/dev/testInteraction.ts
 * Or: ts-node src/server/dev/testInteraction.ts
 */

import { checkInteractions } from "../orchestrator"
import type { InteractionCheckRequest } from "../types"

async function main() {
  console.log("Testing interaction checking pipeline...\n")
  
  const testRequest: InteractionCheckRequest = {
    items: [
      { value: "metformin" },
      { value: "ibuprofen" },
    ],
    options: {
      includeAi: false, // Set to true to test AI (requires OPENAI_API_KEY)
    },
  }
  
  console.log("Request:", JSON.stringify(testRequest, null, 2))
  console.log("\nRunning check...\n")
  
  try {
    const startTime = Date.now()
    const result = await checkInteractions(testRequest)
    const duration = Date.now() - startTime
    
    console.log("Result Summary:")
    console.log(`- Calculation Version: ${result.meta.calcVersion}`)
    console.log(`- Total Duration: ${duration}ms`)
    console.log(`- Lookup: ${result.meta.timing.lookupMs}ms`)
    console.log(`- Pair Processing: ${result.meta.timing.pairProcessingMs}ms`)
    console.log(`- Triple Processing: ${result.meta.timing.tripleProcessingMs}ms`)
    console.log("\nCache Stats:")
    console.log(`- Med Lookup Hits: ${result.meta.cacheStats.medLookupHits}, Misses: ${result.meta.cacheStats.medLookupMisses}`)
    console.log(`- Pair Cache Hits: ${result.meta.cacheStats.pairCacheHits}, Misses: ${result.meta.cacheStats.pairCacheMisses}`)
    console.log(`- CMS Cache Hits: ${result.meta.cacheStats.cmsCacheHits}, Misses: ${result.meta.cacheStats.cmsCacheMisses}`)
    
    console.log("\nPairs Found:", result.results.pairs.length)
    for (const pair of result.results.pairs) {
      console.log(`\n- ${pair.itemA} + ${pair.itemB}:`)
      console.log(`  Severity: ${pair.severity}`)
      console.log(`  Confidence: ${(pair.confidence * 100).toFixed(1)}%`)
      console.log(`  Sources: ${pair.sources.map((s) => s.name).join(", ")}`)
      console.log(`  Summary: ${pair.summary.substring(0, 100)}...`)
    }
    
    console.log("\nSingles Found:", result.results.singles.length)
    for (const single of result.results.singles) {
      console.log(`\n- ${single.itemName}:`)
      console.log(`  Sources: ${single.sources.map((s) => s.name).join(", ")}`)
      console.log(`  Summary: ${single.safetySummary.substring(0, 100)}...`)
    }
    
    console.log("\nTriples Found:", result.results.triples.length)
    
    console.log("\n✅ Test completed successfully!")
  } catch (error) {
    console.error("\n❌ Test failed:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error)
    process.exit(1)
  })
}

