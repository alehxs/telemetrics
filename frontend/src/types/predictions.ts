/**
 * TypeScript interfaces for F1 Race Predictions
 *
 * These types match the database schema and API responses for the
 * ML-powered race prediction system.
 */

/**
 * Individual driver prediction within a race
 */
export interface DriverPrediction {
  position: number;
  driver_abbr: string;
  driver_name: string;
  team: string;
  predicted_race_time_seconds: number;
  qualifying_time: number;
  qualifying_position: number;
  features: Record<string, number>;
}

/**
 * Model metadata containing training info and performance metrics
 */
export interface ModelMetadata {
  version: string;
  mae?: number;
  trained_on?: string;
  features?: string[];
  feature_importance?: Record<string, number>;
}

/**
 * Complete predictions structure stored in JSONB column
 */
export interface PredictionsData {
  predictions: DriverPrediction[];
  podium: string[]; // Top 3 driver abbreviations
  model_metadata: ModelMetadata;
}

/**
 * Race prediction record from database
 */
export interface RacePrediction {
  id: number;
  year: number;
  grand_prix: string;
  session: string;
  model_version: string;
  training_data_range: string;
  features_used: string[];
  mae_score: number | null;
  predictions: PredictionsData;
  created_at: string;
  updated_at: string;
}

/**
 * Simplified prediction for display components
 */
export interface SimplePrediction {
  position: number;
  driver: string;
  team: string;
  predictedTime: number;
  qualifyingPosition: number;
}

/**
 * API response when fetching predictions
 */
export interface PredictionsResponse {
  data: RacePrediction | null;
  error: Error | null;
}

/**
 * Props for prediction display components
 */
export interface PredictionDisplayProps {
  year: number;
  grandPrix: string;
  session?: string;
}

/**
 * Prediction comparison (predicted vs actual)
 */
export interface PredictionComparison {
  driver_abbr: string;
  predicted_position: number;
  actual_position: number;
  position_diff: number;
  predicted_time: number;
  actual_time: number;
}
