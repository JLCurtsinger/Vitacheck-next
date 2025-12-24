import { NextResponse } from 'next/server'
import { query } from '@/src/server/db/query'

// Use Node.js runtime (not Edge) for database connections
export const runtime = 'nodejs'

/**
 * Health check endpoint for database connectivity.
 * GET /api/health/db
 * 
 * Returns:
 * - { ok: true, db: true, tables: [...] } on success (200)
 * - { ok: false, error: "..." } on failure (500)
 */
export async function GET() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL missing' },
      { status: 500 }
    )
  }

  try {
    // Simple health check query
    const result = await query<{ ok: number }>('SELECT 1 AS ok')
    
    if (result.rows.length === 0 || result.rows[0].ok !== 1) {
      return NextResponse.json(
        { ok: false, db: false, error: 'Database query returned unexpected result', tables: [] },
        { status: 500 }
      )
    }

    // Check for required tables
    const tableCheckResult = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema='public' 
       AND table_name IN ('med_lookup_cache','pair_interaction_cache','cms_usage_cache','interaction_checks_log')`
    )

    const tables = tableCheckResult.rows.map(row => row.table_name)

    return NextResponse.json({ ok: true, db: true, tables })
  } catch (error) {
    // Never expose connection details or secrets in error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Safe server-side logging: only log error message with prefix, never connection strings
    console.error('[db-health]', errorMessage)
    
    // Try to get table list even on error
    let tables: string[] = []
    try {
      const tableCheckResult = await query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema='public' 
         AND table_name IN ('med_lookup_cache','pair_interaction_cache','cms_usage_cache','interaction_checks_log')`
      )
      tables = tableCheckResult.rows.map(row => row.table_name)
    } catch {
      // Ignore table check errors if main query already failed
    }
    
    return NextResponse.json(
      { ok: false, db: false, error: errorMessage, tables },
      { status: 500 }
    )
  }
}

