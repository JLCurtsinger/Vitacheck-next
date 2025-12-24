import "server-only"
import { Pool } from "pg"

/**
 * Server-only database connection pool for Neon Postgres.
 * Uses pooled connection string for serverless compatibility.
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Create a singleton Pool instance
// Neon pooled connections are serverless-safe and handle connection pooling automatically
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL for pooled connections
  ssl: {
    rejectUnauthorized: false,
  },
})

// Handle pool errors without exposing connection details
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message)
})

