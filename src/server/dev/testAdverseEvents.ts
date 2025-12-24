import "server-only"
import { fetchSingleDrugAdverseEvents } from "../providers/openfdaEvents"

/**
 * Test script to verify openFDA adverse events provider handles responses correctly.
 * Run with: npx tsx src/server/dev/testAdverseEvents.ts
 */
async function testAdverseEvents() {
  const testDrugs = [
    { name: "ibuprofen", rxcui: undefined },
    { name: "warfarin", rxcui: undefined },
  ]
  
  console.log("Testing openFDA adverse events for single drugs")
  console.log("=" .repeat(60))
  
  for (const drug of testDrugs) {
    console.log(`\nFetching adverse events for: ${drug.name}`)
    const result = await fetchSingleDrugAdverseEvents(drug.name, drug.rxcui)
    
    if (result.error) {
      console.log(`  ✗ Error: ${result.error}`)
      console.log(`  Timing: ${result.timingMs}ms`)
    } else if (result.data) {
      console.log(`  ✓ Success`)
      console.log(`  Total events: ${result.data.totalEvents}`)
      console.log(`  Serious events: ${result.data.seriousEvents}`)
      console.log(`  Outcomes: ${JSON.stringify(result.data.outcomes)}`)
      console.log(`  Timing: ${result.timingMs}ms`)
    } else {
      console.log(`  ? No data returned (but no error)`)
      console.log(`  Timing: ${result.timingMs}ms`)
    }
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("Test complete")
  console.log("\nNote: Empty results (0 events) are OK - this means no matching records found.")
  console.log("HTTP 404/400 should return empty results, not errors.")
}

// Run if executed directly
if (require.main === module) {
  testAdverseEvents().catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
}

export { testAdverseEvents }

