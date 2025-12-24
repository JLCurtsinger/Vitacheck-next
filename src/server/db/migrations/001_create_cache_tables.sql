-- Migration: Create cache tables for interaction checking pipeline
-- Run this in Neon SQL editor manually
-- Version: 1.0.0

-- A) med_lookup_cache: Cache for medication lookups (RxNorm, SUPP.AI, FDA label)
CREATE TABLE IF NOT EXISTS med_lookup_cache (
  normalized_value TEXT PRIMARY KEY,
  rxnorm_rxcui TEXT,
  suppai_id TEXT,
  fda_label_warnings JSONB,
  fda_label_rxcui TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on updated_at for potential cleanup queries
CREATE INDEX IF NOT EXISTS idx_med_lookup_cache_updated_at ON med_lookup_cache(updated_at);

-- B) pair_interaction_cache: Cache for pair interaction results
CREATE TABLE IF NOT EXISTS pair_interaction_cache (
  pair_key TEXT PRIMARY KEY,
  a_value TEXT NOT NULL,
  b_value TEXT NOT NULL,
  result_json JSONB NOT NULL,
  sources_hash TEXT NOT NULL,
  calc_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pair cache lookups
CREATE INDEX IF NOT EXISTS idx_pair_interaction_cache_a_value ON pair_interaction_cache(a_value);
CREATE INDEX IF NOT EXISTS idx_pair_interaction_cache_b_value ON pair_interaction_cache(b_value);
CREATE INDEX IF NOT EXISTS idx_pair_interaction_cache_calc_version ON pair_interaction_cache(calc_version);

-- C) cms_usage_cache: Cache for CMS Part D beneficiary counts
CREATE TABLE IF NOT EXISTS cms_usage_cache (
  normalized_value TEXT PRIMARY KEY,
  beneficiaries BIGINT,
  year INT,
  source_meta JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on updated_at for potential cleanup queries
CREATE INDEX IF NOT EXISTS idx_cms_usage_cache_updated_at ON cms_usage_cache(updated_at);

-- D) interaction_checks_log: Optional logging table for analytics
CREATE TABLE IF NOT EXISTS interaction_checks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  items JSONB NOT NULL,
  result_summary JSONB,
  latency_ms INT,
  cache_hits JSONB
);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_interaction_checks_log_created_at ON interaction_checks_log(created_at);

