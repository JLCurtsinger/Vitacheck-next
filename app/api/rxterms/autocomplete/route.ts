import { NextRequest, NextResponse } from 'next/server'
import { fetchRxTermsAutocomplete } from '@/lib/rxnav'

// Use Node.js runtime (not Edge) for fetch with timeout support
export const runtime = 'nodejs'

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 80

/**
 * Autocomplete endpoint for medication names using RxTerms API.
 * GET /api/rxterms/autocomplete?q={query}
 * 
 * Returns:
 * - { results: { display: string; value: string }[] } with matching medication names (200)
 * - { results: [] } if query is invalid or no matches found (200)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let query = searchParams.get('q')?.trim() || ''

  // Validate input: minimum length
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { results: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  }

  // Enforce maximum length
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.substring(0, MAX_QUERY_LENGTH)
  }

  try {
    const results = await fetchRxTermsAutocomplete(query)
    
    return NextResponse.json(
      { results },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    // Return empty results on any error to keep autocomplete resilient
    // Don't surface internal errors to client
    return NextResponse.json(
      { results: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  }
}

