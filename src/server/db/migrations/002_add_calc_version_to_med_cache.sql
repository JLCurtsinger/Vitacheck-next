-- Migration: Add calc_version column to med_lookup_cache
-- Run this in Neon SQL editor manually
-- Version: 1.0.1

-- Add calc_version column to med_lookup_cache
ALTER TABLE med_lookup_cache 
ADD COLUMN IF NOT EXISTS calc_version TEXT DEFAULT 'v1.0.0';

-- Create index on calc_version for faster lookups
CREATE INDEX IF NOT EXISTS idx_med_lookup_cache_calc_version ON med_lookup_cache(calc_version);

-- Update existing rows to have calc_version (they will be invalidated on next lookup)
UPDATE med_lookup_cache SET calc_version = 'v1.0.0' WHERE calc_version IS NULL;

