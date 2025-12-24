import "server-only"
import { fetchWithTimeout } from "../utils/timeout"
import type { ProviderResponse, InteractionSource, InteractionSeverity } from "../types"
import crypto from "crypto"

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
const TIMEOUT_AI = 30000 // 30 seconds for AI calls

/**
 * Optional AI literature analysis.
 * Makes at most ONE OpenAI call per pair.
 * Returns structured JSON with severity suggestion, mechanisms, citations.
 */
export async function analyzeAiLiterature(
  itemA: string,
  itemB: string,
  evidenceBundle: string[] // Max 3-5 abstracts or snippets
): Promise<ProviderResponse<InteractionSource>> {
  const startTime = Date.now()
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return {
      data: null,
      error: "OPENAI_API_KEY not configured",
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
  
  try {
    // Build compact prompt with evidence bundle
    const evidenceText = evidenceBundle.slice(0, 5).join("\n\n---\n\n")
    
    const prompt = `Analyze potential drug interactions between "${itemA}" and "${itemB}" based on the following evidence:

${evidenceText}

Provide a structured analysis in JSON format with:
- severity: "none", "mild", "moderate", "severe", or "unknown"
- mechanisms: brief description of interaction mechanisms if known
- summary: 2-3 sentence summary
- uncertainty: any limitations or uncertainties in the analysis
- citations: array of relevant citation URLs or IDs if available

Respond ONLY with valid JSON, no markdown formatting.`

    const response = await fetchWithTimeout(OPENAI_API_URL, {
      timeout: TIMEOUT_AI,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use cheaper model for cost control
        messages: [
          {
            role: "system",
            content: "You are a medical literature analysis assistant. Provide structured, evidence-based analysis of drug interactions. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 500, // Limit tokens for cost control
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return {
        data: null,
        error: `OpenAI API error: ${response.status} - ${errorText}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      return {
        data: null,
        error: "No content in OpenAI response",
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    // Parse JSON response (remove markdown code blocks if present)
    let parsed: any
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      parsed = JSON.parse(cleaned)
    } catch (parseError) {
      return {
        data: null,
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        cached: false,
        timingMs: Date.now() - startTime,
      }
    }
    
    // Map to InteractionSource
    const severity: InteractionSeverity = parsed.severity || "unknown"
    
    // Never allow AI to be sole source for "severe" - this is enforced in consensus
    const source: InteractionSource = {
      name: "AI Literature",
      severity,
      confidence: 0.6, // Base confidence for AI (will be adjusted)
      summary: parsed.summary || `AI analysis suggests ${severity} interaction between ${itemA} and ${itemB}`,
      details: {
        mechanisms: parsed.mechanisms,
        uncertainty: parsed.uncertainty,
        evidenceBundle: evidenceBundle.length,
      },
      citations: parsed.citations || [],
      lastUpdated: new Date().toISOString(),
    }
    
    return {
      data: source,
      cached: false,
      timingMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      cached: false,
      timingMs: Date.now() - startTime,
    }
  }
}

/**
 * Fetch PubMed abstracts (stub - implement if needed for evidence bundle).
 * For now, returns empty array - can be enhanced with actual PubMed API calls.
 */
export async function fetchPubMedEvidence(
  itemA: string,
  itemB: string
): Promise<string[]> {
  // TODO: Implement PubMed API fetch if needed
  // For now, return empty array (AI will work with other evidence)
  return []
}

