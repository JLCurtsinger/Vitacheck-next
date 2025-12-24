import "server-only"
import { pool } from "./pool"

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

