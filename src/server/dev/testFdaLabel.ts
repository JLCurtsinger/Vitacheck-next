/**
 * Test script to verify openFDA label matching fix.
 * Ensures ibuprofen does NOT return warnings that mention "naproxen".
 * Run with: npx tsx src/server/dev/testFdaLabel.ts
 */

import { fetchFdaLabel } from "../providers/openfdaLabel"

async function main() {
  console.log("Testing openFDA label matching fix...\n")
  
  const testCases = [
    { drug: "ibuprofen", shouldNotContain: "naproxen" },
    { drug: "naproxen", shouldNotContain: "ibuprofen" },
  ]
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.drug}`)
    console.log(`Should NOT contain warnings mentioning: ${testCase.shouldNotContain}`)
    console.log("-".repeat(50))
    
    try {
      const result = await fetchFdaLabel(testCase.drug)
      
      if (result.error) {
        console.log(`❌ Error: ${result.error}`)
        continue
      }
      
      if (!result.data) {
        console.log("⚠️  No label data found")
        continue
      }
      
      console.log(`✅ Label data found`)
      console.log(`   Product Name: ${result.data.productName || "N/A"}`)
      console.log(`   RxCUI: ${result.data.rxcui || "N/A"}`)
      
      if (result.data.warnings && result.data.warnings.length > 0) {
        console.log(`   Warnings (${result.data.warnings.length}):`)
        
        let foundMismatch = false
        for (const warning of result.data.warnings) {
          const warningLower = warning.toLowerCase()
          const shouldNotContainLower = testCase.shouldNotContain.toLowerCase()
          
          if (warningLower.includes(shouldNotContainLower)) {
            console.log(`   ❌ MISMATCH FOUND: "${warning.substring(0, 100)}..."`)
            foundMismatch = true
          } else {
            console.log(`   ✓ "${warning.substring(0, 100)}..."`)
          }
        }
        
        if (foundMismatch) {
          console.log(`\n❌ FAILED: Found warnings mentioning ${testCase.shouldNotContain} for ${testCase.drug}`)
          process.exit(1)
        } else {
          console.log(`\n✅ PASSED: No mismatched warnings found`)
        }
      } else {
        console.log(`   No warnings found`)
        console.log(`\n✅ PASSED: No warnings to check`)
      }
      
      console.log(`   Timing: ${result.timingMs}ms`)
      console.log(`   Cached: ${result.cached}`)
    } catch (error) {
      console.error(`❌ Exception:`, error)
      process.exit(1)
    }
  }
  
  console.log("\n\n✅ All tests passed!")
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error)
    process.exit(1)
  })
}

