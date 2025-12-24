import { Pool } from 'pg'

/**
 * Server-only database connection pool.
 * Uses Neon pooled connection string for serverless compatibility.
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create a singleton Pool instance
// Neon pooled connections are serverless-safe and handle connection pooling automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL for pooled connections
  ssl: {
    rejectUnauthorized: false,
  },
})

// Handle pool errors without exposing connection details
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message)
})

/**
 * Execute a query against the database pool.
 * @param text SQL query text
 * @param params Query parameters (optional)
 * @returns Query result
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    }
  } finally {
    client.release()
  }
}

/**
 * Get the database pool instance (for advanced use cases).
 * Prefer using the `query` function for most cases.
 */
export { pool }

