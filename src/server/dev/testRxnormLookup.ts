import "server-only"
import { lookupRxCUI } from "../providers/rxnorm"

/**
 * Test script to verify RxNorm lookup resolves RxCUIs for common medications.
 * Run with: npx tsx src/server/dev/testRxnormLookup.ts
 */
async function testRxNormLookup() {
  const testDrugs = ["warfarin", "ibuprofen", "metformin"]
  
  console.log("Testing RxNorm lookup for:", testDrugs.join(", "))
  console.log("=" .repeat(60))
  
  for (const drug of testDrugs) {
    console.log(`\nLooking up: ${drug}`)
    const result = await lookupRxCUI(drug)
    
    if (result.data?.rxcui) {
      console.log(`  ✓ Success: RxCUI = ${result.data.rxcui}`)
      console.log(`  Timing: ${result.timingMs}ms`)
    } else {
      console.log(`  ✗ Failed: ${result.error || "No RxCUI found"}`)
      console.log(`  Timing: ${result.timingMs}ms`)
    }
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("Test complete")
}

// Run if executed directly
if (require.main === module) {
  testRxNormLookup().catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
}

export { testRxNormLookup }

