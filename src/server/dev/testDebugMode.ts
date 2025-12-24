/**
 * Test script to verify debug mode functionality.
 * Tests that debug mode returns provider statuses without secrets.
 * Run with: npx tsx src/server/dev/testDebugMode.ts
 */

import { checkInteractions } from "../orchestrator"
import type { InteractionCheckRequest } from "../types"

async function main() {
  console.log("Testing debug mode...\n")
  
  const testCases = [
    {
      name: "metformin + ibuprofen",
      items: [
        { value: "metformin" },
        { value: "ibuprofen" },
      ],
    },
    {
      name: "warfarin + ibuprofen",
      items: [
        { value: "warfarin" },
        { value: "ibuprofen" },
      ],
    },
  ]
  
  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`Test Case: ${testCase.name}`)
    console.log("=".repeat(60))
    
    const request: InteractionCheckRequest = {
      items: testCase.items,
      options: {
        debug: true,
        includeAi: false,
      },
    }
    
    try {
      const result = await checkInteractions(request)
      
      if (!result.debug) {
        console.log("❌ FAILED: Debug info not present in response")
        process.exit(1)
      }
      
      console.log("\n✅ Debug info present")
      console.log("\nProvider Statuses:")
      
      const statuses = result.debug.providerStatuses
      for (const [providerName, status] of Object.entries(statuses)) {
        console.log(`\n  ${providerName}:`)
        console.log(`    attempted: ${status.attempted}`)
        console.log(`    ok: ${status.ok}`)
        console.log(`    ms: ${status.ms}`)
        console.log(`    cached: ${status.cached}`)
        if (status.error) {
          console.log(`    error: ${status.error}`)
        }
        
        // Verify no secrets leaked
        if (status.error && (
          status.error.includes("SUPPAI_API_KEY") ||
          status.error.includes("OPENAI_API_KEY") ||
          status.error.includes("Bearer") ||
          status.error.includes("token")
        )) {
          console.log(`    ❌ SECURITY ISSUE: Error message may contain secrets!`)
          process.exit(1)
        }
      }
      
      if (result.debug.rxcuiResolutions) {
        console.log("\nRxCUI Resolutions:")
        for (const [drug, rxcui] of Object.entries(result.debug.rxcuiResolutions)) {
          console.log(`  ${drug}: ${rxcui || "null"}`)
        }
      }
      
      console.log("\nPair Results:")
      for (const pair of result.results.pairs) {
        console.log(`  ${pair.itemA} + ${pair.itemB}:`)
        console.log(`    severity: ${pair.severity}`)
        console.log(`    confidence: ${(pair.confidence * 100).toFixed(1)}%`)
        console.log(`    sources: ${pair.sources.length}`)
        
        // Verify severity is not "unknown" when checks succeed
        if (pair.severity === "unknown" && pair.sources.length === 0) {
          // Check if any provider failed
          const pairKey = `${pair.itemA}-${pair.itemB}`
          const hasFailure = Object.entries(statuses).some(
            ([name, status]) => name.includes(pairKey) && status.attempted && !status.ok && status.error
          )
          
          if (!hasFailure) {
            console.log(`    ⚠️  WARNING: Severity is "unknown" but no provider failures detected`)
            console.log(`       This may indicate the severity defaulting fix is not working correctly`)
          }
        }
      }
      
      console.log(`\n✅ Test case "${testCase.name}" passed`)
    } catch (error) {
      console.error(`❌ Test case "${testCase.name}" failed:`, error)
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Stack:", error.stack)
      }
      process.exit(1)
    }
  }
  
  console.log("\n\n✅ All debug mode tests passed!")
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error)
    process.exit(1)
  })
}

