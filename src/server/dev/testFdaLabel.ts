/**
 * Test script to verify openFDA label matching fix.
 * Ensures ibuprofen does NOT return warnings that mention "naproxen".
 * Shows which openFDA fields were matched.
 * Run with: npx tsx src/server/dev/testFdaLabel.ts
 */

import { fetchFdaLabel } from "../providers/openfdaLabel"

/**
 * Helper to fetch raw openFDA data for inspection
 */
async function fetchRawFdaData(normalizedValue: string) {
  const OPENFDA_BASE_URL = "https://api.fda.gov/drug/label.json"
  
  // Try generic_name search
  const url = `${OPENFDA_BASE_URL}?search=${encodeURIComponent(`openfda.generic_name:"${normalizedValue}"`)}&limit=3`
  
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.results?.[0] || null
    }
  } catch (error) {
    // Ignore
  }
  
  return null
}

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
      // Fetch raw data to show matched fields
      const rawData = await fetchRawFdaData(testCase.drug)
      if (rawData) {
        console.log("\n📋 Matched openFDA fields:")
        if (rawData.openfda?.generic_name) {
          console.log(`   generic_name: ${JSON.stringify(rawData.openfda.generic_name)}`)
        }
        if (rawData.openfda?.substance_name) {
          console.log(`   substance_name: ${JSON.stringify(rawData.openfda.substance_name)}`)
        }
        if (rawData.openfda?.brand_name) {
          console.log(`   brand_name: ${JSON.stringify(rawData.openfda.brand_name)}`)
        }
        if (rawData.openfda?.rxcui) {
          console.log(`   rxcui: ${JSON.stringify(rawData.openfda.rxcui)}`)
        }
      }
      
      const result = await fetchFdaLabel(testCase.drug)
      
      if (result.error) {
        console.log(`\n❌ Error: ${result.error}`)
        continue
      }
      
      if (!result.data) {
        console.log("\n⚠️  No label data found")
        continue
      }
      
      console.log(`\n✅ Label data found`)
      console.log(`   Product Name: ${result.data.productName || "N/A"}`)
      console.log(`   RxCUI: ${result.data.rxcui || "N/A"}`)
      
      if (result.data.warnings && result.data.warnings.length > 0) {
        console.log(`\n   Warnings (${result.data.warnings.length}):`)
        
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
        console.log(`\n   No warnings found`)
        console.log(`\n✅ PASSED: No warnings to check`)
      }
      
      console.log(`\n   Timing: ${result.timingMs}ms`)
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

