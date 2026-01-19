-- Telemetrics F1 Database Schema
-- Run this in Supabase SQL Editor

-- Main telemetry data table
CREATE TABLE IF NOT EXISTS telemetry_data (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  grand_prix TEXT NOT NULL,
  session TEXT NOT NULL,
  data_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_lookup
  ON telemetry_data(year, grand_prix, session, data_type);

CREATE INDEX IF NOT EXISTS idx_year
  ON telemetry_data(year);

CREATE INDEX IF NOT EXISTS idx_grand_prix
  ON telemetry_data(grand_prix);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_telemetry
  ON telemetry_data(year, grand_prix, session, data_type);

-- Add constraint for valid data_types
ALTER TABLE telemetry_data
  DROP CONSTRAINT IF EXISTS check_valid_data_type;

ALTER TABLE telemetry_data
  ADD CONSTRAINT check_valid_data_type
  CHECK (data_type IN (
    'session_results',
    'podium',
    'fastest_lap',
    'track_dominance',
    'tyres',
    'lap_chart_data',
    'get_session_data'
  ));

-- Row-Level Security (RLS) Policies
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read access" ON telemetry_data;
DROP POLICY IF EXISTS "Service role can insert" ON telemetry_data;
DROP POLICY IF EXISTS "Service role can update" ON telemetry_data;
DROP POLICY IF EXISTS "Service role can delete" ON telemetry_data;

-- Allow anonymous read access (for frontend)
CREATE POLICY "Allow anonymous read access"
  ON telemetry_data
  FOR SELECT
  USING (true);

-- Allow service role to insert/update/delete (for data pipeline)
CREATE POLICY "Service role can insert"
  ON telemetry_data
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update"
  ON telemetry_data
  FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete"
  ON telemetry_data
  FOR DELETE
  USING (true);
