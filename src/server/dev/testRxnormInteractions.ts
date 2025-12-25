/**
 * Test script for RxNorm interactions provider.
 * Tests the interactions endpoint directly without requiring Next.js server-only modules.
 * Run with: npx tsx src/server/dev/testRxnormInteractions.ts
 */

import { fetchRxNormInteractionsCore } from "../providers/rxnormCore"

// Known RxCUIs for testing
const WARFARIN_RXCUI = "11289"
const IBUPROFEN_RXCUI = "5640"

async function testRxNormInteractions() {
  console.log("Testing RxNorm Interactions")
  console.log("=".repeat(60))
  console.log(`Warfarin RxCUI: ${WARFARIN_RXCUI}`)
  console.log(`Ibuprofen RxCUI: ${IBUPROFEN_RXCUI}`)
  console.log("=".repeat(60))
  
  // Test warfarin + ibuprofen interaction
  console.log("\nTesting interaction: warfarin + ibuprofen")
  console.log(`RxCUIs: ${WARFARIN_RXCUI} + ${IBUPROFEN_RXCUI}`)
  
  const startTime = Date.now()
  const result = await fetchRxNormInteractionsCore(
    WARFARIN_RXCUI,
    IBUPROFEN_RXCUI,
    10000
  )
  const duration = Date.now() - startTime
  
  console.log("\n--- Results ---")
  console.log(`URL: ${result.url}`)
  console.log(`Status Code: ${result.status}`)
  console.log(`Duration: ${duration}ms`)
  
  if (result.error) {
    console.log(`Error: ${result.error}`)
  }
  
  if (result.data) {
    console.log("\nInteraction Found:")
    console.log(`  Severity: ${result.data.severity || "unknown"}`)
    console.log(`  Description: ${result.data.description || "N/A"}`)
    console.log(`  Source: ${result.data.source || "N/A"}`)
  } else {
    if (result.status === 404) {
      console.log("\nNo interactions found (404 - API discontinued or no interactions)")
      console.log("This is expected - treating as normalized 'no interactions' case")
    } else {
      console.log("\nNo interactions found")
    }
  }
  
  console.log("\n--- Summary ---")
  if (result.status === 404) {
    console.log("✓ 404 response normalized to 'no interactions found' (ok: true)")
  } else if (result.error) {
    console.log(`✗ Error: ${result.error}`)
  } else if (result.data) {
    console.log("✓ Interaction found successfully")
  } else {
    console.log("✓ No interaction found (normal case)")
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("Test complete")
}

// Run if executed directly
if (require.main === module) {
  testRxNormInteractions().catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
}

export { testRxNormInteractions }

