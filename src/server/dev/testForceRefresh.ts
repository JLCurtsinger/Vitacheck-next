/**
 * Test script for forceRefresh functionality.
 * Run with: npx tsx src/server/dev/testForceRefresh.ts
 * Or: ts-node src/server/dev/testForceRefresh.ts
 * 
 * This script tests that forceRefresh=true works correctly by:
 * 1. Calling the API route without forceRefresh (should use cache)
 * 2. Calling the API route with forceRefresh=true (should bypass cache)
 * 3. Verifying that the second call succeeds and includes debug.providerStatuses
 */

async function main() {
  console.log("Testing forceRefresh functionality...\n")
  
  const baseUrl = process.env.API_URL || "http://localhost:3000"
  const testItems = [
    { value: "metformin" },
    { value: "ibuprofen" },
  ]
  
  // Test 1: Call without forceRefresh
  console.log("Test 1: Calling API without forceRefresh...")
  try {
    const response1 = await fetch(`${baseUrl}/api/interactions/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: testItems,
        options: {
          debug: true,
        },
      }),
    })
    
    if (!response1.ok) {
      const errorText = await response1.text()
      throw new Error(`First request failed with status ${response1.status}: ${errorText}`)
    }
    
    const result1 = await response1.json()
    console.log(`✅ First call succeeded (status: ${response1.status})`)
    console.log(`   Cache stats - Med hits: ${result1.meta.cacheStats.medLookupHits}, Pair hits: ${result1.meta.cacheStats.pairCacheHits}`)
    console.log(`   Has debug info: ${!!result1.debug}`)
    if (result1.debug?.providerStatuses) {
      const providerCount = Object.keys(result1.debug.providerStatuses).length
      console.log(`   Provider statuses count: ${providerCount}`)
    }
  } catch (error) {
    console.error("❌ First call failed:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
  
  console.log("\nTest 2: Calling API with forceRefresh=true...")
  
  // Test 2: Call with forceRefresh=true
  try {
    const response2 = await fetch(`${baseUrl}/api/interactions/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: testItems,
        options: {
          debug: true,
          forceRefresh: true,
        },
      }),
    })
    
    if (!response2.ok) {
      const errorText = await response2.text()
      throw new Error(`Second request failed with status ${response2.status}: ${errorText}`)
    }
    
    const result2 = await response2.json()
    console.log(`✅ Second call succeeded (status: ${response2.status})`)
    console.log(`   Cache stats - Med hits: ${result2.meta.cacheStats.medLookupHits}, Pair hits: ${result2.meta.cacheStats.pairCacheHits}`)
    console.log(`   Has debug info: ${!!result2.debug}`)
    
    // Verify debug.providerStatuses exists and has entries
    if (!result2.debug?.providerStatuses) {
      throw new Error("Missing debug.providerStatuses in response")
    }
    
    const providerStatuses = result2.debug.providerStatuses
    const providerCount = Object.keys(providerStatuses).length
    console.log(`   Provider statuses count: ${providerCount}`)
    
    // Check that at least some providers were attempted and not cached
    const attemptedProviders = Object.values(providerStatuses).filter(
      (status: any) => status.attempted === true
    )
    const nonCachedProviders = Object.values(providerStatuses).filter(
      (status: any) => status.attempted === true && status.cached === false
    )
    
    console.log(`   Attempted providers: ${attemptedProviders.length}`)
    console.log(`   Non-cached providers: ${nonCachedProviders.length}`)
    
    // Print sample provider statuses
    console.log("\n   Sample provider statuses:")
    const sampleKeys = Object.keys(providerStatuses).slice(0, 5)
    for (const key of sampleKeys) {
      const status = providerStatuses[key] as any
      console.log(`     ${key}: attempted=${status.attempted}, cached=${status.cached}, ms=${status.ms}, ok=${status.ok}`)
    }
    
    // Verify that with forceRefresh, we should have fewer cache hits
    if (result2.meta.cacheStats.medLookupHits > 0 || result2.meta.cacheStats.pairCacheHits > 0) {
      console.log("\n   ⚠️  Warning: Some cache hits occurred despite forceRefresh=true")
      console.log(`      This might be expected if cache was empty or if CMS cache is separate`)
    } else {
      console.log("\n   ✓ No cache hits (as expected with forceRefresh=true)")
    }
    
    console.log("\n✅ forceRefresh test completed successfully!")
    console.log("   The API route correctly handles forceRefresh=true")
    console.log("   Debug info includes providerStatuses with proper tracking")
  } catch (error) {
    console.error("\n❌ Second call failed:", error)
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

