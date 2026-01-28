-- ============================================================================
-- F1 Race Predictions Table
-- ============================================================================
-- Stores ML-generated race predictions for future F1 races
-- Supports multiple model versions and historical comparison
-- ============================================================================

-- Drop existing table if recreating (CAUTION: removes all data)
-- DROP TABLE IF EXISTS race_predictions CASCADE;

CREATE TABLE IF NOT EXISTS race_predictions (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- Race identification
    year INTEGER NOT NULL,
    grand_prix TEXT NOT NULL,
    session TEXT DEFAULT 'Race' NOT NULL,

    -- Model metadata
    model_version TEXT NOT NULL,
    training_data_range TEXT NOT NULL,  -- e.g., "2018-2024"
    features_used TEXT[],               -- Array of feature names used

    -- Model performance
    mae_score FLOAT,                    -- Mean Absolute Error in seconds

    -- Prediction data (JSONB for flexibility)
    predictions JSONB NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Unique constraint: one prediction per race/session/model version
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_prediction
    ON race_predictions(year, grand_prix, session, model_version);

-- Query by year and grand prix (most common lookup)
CREATE INDEX IF NOT EXISTS idx_race_lookup
    ON race_predictions(year, grand_prix);

-- Query by model version (for comparing model performance)
CREATE INDEX IF NOT EXISTS idx_model_version
    ON race_predictions(model_version);

-- GIN index for JSONB queries (searching within predictions)
CREATE INDEX IF NOT EXISTS idx_predictions_jsonb
    ON race_predictions USING GIN (predictions);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE race_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read predictions (for frontend)
CREATE POLICY "Allow public read access to predictions"
    ON race_predictions
    FOR SELECT
    USING (true);

-- Policy: Only service role can insert/update predictions (backend scripts)
CREATE POLICY "Allow service role to insert predictions"
    ON race_predictions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow service role to update predictions"
    ON race_predictions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_race_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS race_predictions_updated_at_trigger ON race_predictions;
CREATE TRIGGER race_predictions_updated_at_trigger
    BEFORE UPDATE ON race_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_race_predictions_updated_at();

-- ============================================================================
-- Example JSONB Structure for predictions column
-- ============================================================================
-- {
--   "predictions": [
--     {
--       "position": 1,
--       "driver_abbr": "VER",
--       "driver_name": "Max Verstappen",
--       "team": "Red Bull Racing",
--       "predicted_race_time_seconds": 5234.56,
--       "qualifying_time": 78.234,
--       "qualifying_position": 1,
--       "features": {
--         "qualifying_time": 78.234,
--         "avg_sector_time": 26.078,
--         "track_history_avg": 5.2
--       }
--     },
--     ...
--   ],
--   "podium": ["VER", "NOR", "LEC"],
--   "model_metadata": {
--     "version": "v1.0",
--     "mae": 12.34,
--     "trained_on": "2018-2024",
--     "feature_importance": {
--       "qualifying_time": 0.65,
--       "track_history_avg": 0.25,
--       "avg_sector_time": 0.10
--     }
--   }
-- }

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View all predictions
-- SELECT year, grand_prix, model_version, mae_score,
--        predictions->'podium' as predicted_podium
-- FROM race_predictions
-- ORDER BY year DESC, grand_prix;

-- Get specific race prediction
-- SELECT predictions
-- FROM race_predictions
-- WHERE year = 2025 AND grand_prix = 'Bahrain Grand Prix' AND session = 'Race'
-- ORDER BY created_at DESC LIMIT 1;

-- Compare model versions
-- SELECT model_version, AVG(mae_score) as avg_mae, COUNT(*) as num_predictions
-- FROM race_predictions
-- GROUP BY model_version
-- ORDER BY avg_mae;
