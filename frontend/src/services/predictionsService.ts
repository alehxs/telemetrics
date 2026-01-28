/**
 * Predictions Service
 *
 * Handles fetching and managing F1 race predictions from Supabase.
 * Provides type-safe access to ML-generated race predictions.
 */

import { supabase } from './supabase';
import type {
  RacePrediction,
  PredictionsResponse,
  SimplePrediction,
} from '../types/predictions';

/**
 * Fetch race predictions for a specific Grand Prix
 *
 * @param year - Race year (e.g., 2025)
 * @param grandPrix - Grand Prix name (e.g., "Bahrain Grand Prix")
 * @param session - Session type (default: "Race")
 * @param modelVersion - Specific model version (optional, defaults to latest)
 * @returns Promise with prediction data or error
 */
export async function getRacePredictions(
  year: number,
  grandPrix: string,
  session: string = 'Race',
  modelVersion?: string
): Promise<PredictionsResponse> {
  try {
    let query = supabase
      .from('race_predictions')
      .select('*')
      .eq('year', year)
      .eq('grand_prix', grandPrix)
      .eq('session', session);

    // Filter by model version if specified
    if (modelVersion) {
      query = query.eq('model_version', modelVersion);
    }

    // Get the most recent prediction
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching predictions:', error);
      return { data: null, error };
    }

    return { data: data as RacePrediction, error: null };
  } catch (error) {
    console.error('Unexpected error fetching predictions:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Fetch all predictions for a specific year (full season)
 *
 * @param year - Season year
 * @param session - Session type (default: "Race")
 * @returns Promise with array of predictions
 */
export async function getSeasonPredictions(
  year: number,
  session: string = 'Race'
): Promise<RacePrediction[]> {
  try {
    const { data, error } = await supabase
      .from('race_predictions')
      .select('*')
      .eq('year', year)
      .eq('session', session)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching season predictions:', error);
      return [];
    }

    return (data as RacePrediction[]) || [];
  } catch (error) {
    console.error('Unexpected error fetching season predictions:', error);
    return [];
  }
}

/**
 * Convert full prediction data to simplified format for display
 *
 * @param prediction - Full race prediction record
 * @returns Array of simplified predictions for easy rendering
 */
export function simplifyPredictions(
  prediction: RacePrediction
): SimplePrediction[] {
  if (!prediction?.predictions?.predictions) {
    return [];
  }

  return prediction.predictions.predictions.map((pred) => ({
    position: pred.position,
    driver: pred.driver_abbr,
    team: pred.team,
    predictedTime: pred.predicted_race_time_seconds,
    qualifyingPosition: pred.qualifying_position,
  }));
}

/**
 * Get predicted podium (top 3) for a race
 *
 * @param year - Race year
 * @param grandPrix - Grand Prix name
 * @returns Promise with array of top 3 driver abbreviations
 */
export async function getPredictedPodium(
  year: number,
  grandPrix: string
): Promise<string[]> {
  const { data } = await getRacePredictions(year, grandPrix);

  if (!data?.predictions?.podium) {
    return [];
  }

  return data.predictions.podium;
}

/**
 * Get model metadata (performance metrics, feature importance)
 *
 * @param year - Race year
 * @param grandPrix - Grand Prix name
 * @returns Promise with model metadata
 */
export async function getModelMetadata(
  year: number,
  grandPrix: string
) {
  const { data } = await getRacePredictions(year, grandPrix);

  if (!data?.predictions?.model_metadata) {
    return null;
  }

  return data.predictions.model_metadata;
}

/**
 * Check if predictions exist for a specific race
 *
 * @param year - Race year
 * @param grandPrix - Grand Prix name
 * @param session - Session type
 * @returns Promise<boolean> - True if predictions exist
 */
export async function hasPredictions(
  year: number,
  grandPrix: string,
  session: string = 'Race'
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('race_predictions')
      .select('id', { count: 'exact', head: true })
      .eq('year', year)
      .eq('grand_prix', grandPrix)
      .eq('session', session);

    if (error) {
      console.error('Error checking predictions:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error('Unexpected error checking predictions:', error);
    return false;
  }
}

/**
 * Get list of all Grand Prix with predictions for a given year
 *
 * @param year - Season year
 * @returns Promise with array of Grand Prix names that have predictions
 */
export async function getRacesWithPredictions(year: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('race_predictions')
      .select('grand_prix')
      .eq('year', year)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching races with predictions:', error);
      return [];
    }

    // Return unique grand prix names
    const uniqueRaces = [...new Set(data?.map((row) => row.grand_prix) || [])];
    return uniqueRaces;
  } catch (error) {
    console.error('Unexpected error fetching races with predictions:', error);
    return [];
  }
}

/**
 * Format predicted race time for display (convert seconds to MM:SS.mmm)
 *
 * @param seconds - Race time in seconds
 * @returns Formatted time string
 */
export function formatRaceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Calculate time gap between drivers
 *
 * @param time1 - First driver's time in seconds
 * @param time2 - Second driver's time in seconds (reference)
 * @returns Gap in seconds (positive if time1 is slower)
 */
export function calculateTimeGap(time1: number, time2: number): number {
  return time1 - time2;
}

/**
 * Format time gap for display
 *
 * @param gap - Time gap in seconds
 * @returns Formatted gap string (e.g., "+12.345s")
 */
export function formatTimeGap(gap: number): string {
  if (gap === 0) return '---';
  const sign = gap > 0 ? '+' : '';
  return `${sign}${gap.toFixed(3)}s`;
}
