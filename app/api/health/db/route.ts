import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Use Node.js runtime (not Edge) for database connections
export const runtime = 'nodejs'

/**
 * Health check endpoint for database connectivity.
 * GET /api/health/db
 * 
 * Returns:
 * - { ok: true, db: "connected" } on success (200)
 * - { ok: false, error: "..." } on failure (500)
 */
export async function GET() {
  try {
    // Simple health check query
    const result = await query<{ ok: number }>('SELECT 1 AS ok')
    
    if (result.rows.length === 0 || result.rows[0].ok !== 1) {
      return NextResponse.json(
        { ok: false, error: 'Database query returned unexpected result' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, db: 'connected' })
  } catch (error) {
    // Never expose connection details or secrets in error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Safe server-side logging: only log error message with prefix, never connection strings
    console.error('[db-health]', errorMessage)
    
    return NextResponse.json(
      { ok: false, error: 'Database connection failed' },
      { status: 500 }
    )
  }
}

