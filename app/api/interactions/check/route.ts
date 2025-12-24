import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { checkInteractions } from "@/src/server/orchestrator"
import type { InteractionCheckRequest } from "@/src/server/types"

// Use Node.js runtime (not Edge) for full server capabilities
export const runtime = "nodejs"

/**
 * POST /api/interactions/check
 * 
 * Main endpoint for interaction checking.
 * Accepts medication items and returns interaction analysis.
 */
export async function POST(req: NextRequest) {
  const requestId = randomUUID().slice(0, 8)
  
  try {
    const body = await req.json()
    
    // Validate request
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'items' array is required" },
        { status: 400 }
      )
    }
    
    // Validate items structure
    for (const item of body.items) {
      if (!item.value || typeof item.value !== "string") {
        return NextResponse.json(
          { error: "Invalid request: each item must have a 'value' string" },
          { status: 400 }
        )
      }
    }
    
    const request: InteractionCheckRequest = {
      items: body.items,
      options: body.options || {},
    }
    
    // Run orchestrator
    const result = await checkInteractions(request)
    
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    // Handle known errors gracefully
    if (error instanceof Error) {
      // Check for validation errors
      if (error.message.includes("Maximum") || error.message.includes("required")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      // Log unexpected errors with requestId
      console.error("[interactions/check]", {
        requestId,
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      })
      
      return NextResponse.json(
        { error: "An error occurred while checking interactions. Please try again.", requestId },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred", requestId },
      { status: 500 }
    )
  }
}

