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
 * 
 * Note: If you encounter weird runtime errors, try deleting .next and restarting the dev server.
 */
export async function POST(req: NextRequest) {
  const requestId = randomUUID().slice(0, 8)
  
  try {
    // Parse JSON with explicit error handling
    let body: any
    try {
      body = await req.json()
    } catch (jsonError) {
      console.error("[/api/interactions/check] JSON parse error", {
        requestId,
        error: jsonError instanceof Error ? {
          name: jsonError.name,
          message: jsonError.message,
          stack: jsonError.stack,
        } : jsonError,
      })
      return NextResponse.json(
        { error: "Invalid JSON", requestId },
        { status: 400 }
      )
    }
    
    // Route reached breadcrumb
    console.log("[/api/interactions/check] start", {
      requestId,
      itemCount: body?.items?.length,
      options: body?.options,
    })
    
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
    
    // Validate and normalize options
    // Supports: debug, includeAi, includeCms, forceRefresh (all optional booleans)
    const options = body.options || {}
    const normalizedOptions: InteractionCheckRequest["options"] = {
      debug: typeof options.debug === "boolean" ? options.debug : undefined,
      includeAi: typeof options.includeAi === "boolean" ? options.includeAi : undefined,
      includeCms: typeof options.includeCms === "boolean" ? options.includeCms : undefined,
      forceRefresh: typeof options.forceRefresh === "boolean" ? options.forceRefresh : false,
    }
    
    const request: InteractionCheckRequest = {
      items: body.items,
      options: normalizedOptions,
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
      
      // Log unexpected errors with requestId (dev-safe, no env vars or secrets)
      console.error("[/api/interactions/check]", {
        requestId,
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
      
      // Build error response
      const errorResponse: any = {
        error: "An error occurred while checking interactions. Please try again.",
        requestId,
      }
      
      // Include dev details in development mode only
      if (process.env.NODE_ENV !== "production") {
        errorResponse.devMessage = error.message
        errorResponse.devStack = error.stack
      }
      
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    // Log non-Error objects
    console.error("[/api/interactions/check]", {
      requestId,
      error: error,
    })
    
    // Build error response for non-Error objects
    const errorResponse: any = {
      error: "An unexpected error occurred",
      requestId,
    }
    
    // Include dev details in development mode only
    if (process.env.NODE_ENV !== "production") {
      errorResponse.devMessage = String(error)
      errorResponse.devStack = undefined
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

