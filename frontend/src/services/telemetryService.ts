import { supabase } from './supabase';
import type {
  DataType,
  SessionResult,
  PodiumDriver,
  FastestLap,
  SessionInfo,
  TrackDominanceData,
  TyreStintEntry,
  LapChartPayload,
  GrandPrixOption,
  SessionOption,
} from '../types/telemetry';
import { validateYear, validateGrandPrix, validateSession, validateDataType, RateLimiter } from '../utils/sanitize';
import { sanitizeNaN } from '../utils/formatters';

// Rate limiter: 60 requests per minute
const rateLimiter = new RateLimiter(60, 60000);

// Request cache: stores in-flight (and resolved) promises by cache key.
// Ensures multiple components requesting the same data fire only one network call.
const requestCache = new Map<string, Promise<unknown>>();

/**
 * Generic function to fetch telemetry data from Supabase
 * Includes input validation, rate limiting, and request deduplication
 */
async function fetchTelemetryData<T>(
  year: number,
  grandPrix: string,
  session: string,
  dataType: DataType
): Promise<T | null> {
  const cacheKey = `${year}/${grandPrix}/${session}/${dataType}`;
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      // Rate limiting check
      if (!rateLimiter.canMakeRequest()) {
        console.warn('Rate limit exceeded. Please wait before making more requests.');
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }

      // Input validation
      const validatedYear = validateYear(year);
      const validatedGrandPrix = validateGrandPrix(grandPrix);
      const validatedSession = validateSession(session);
      const validatedDataType = validateDataType(dataType);

      // Record the request
      rateLimiter.recordRequest();

      const { data, error } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', validatedYear)
        .eq('grand_prix', validatedGrandPrix)
        .eq('session', validatedSession)
        .eq('data_type', validatedDataType)
        .single();

      if (error) {
        console.error(`Error fetching ${dataType}:`, error);
        return null;
      }

      return data?.payload as T;
    } catch (error) {
      console.error(`Failed to fetch ${dataType}:`, error);
      return null;
    }
  })();

  requestCache.set(cacheKey, promise);
  promise.finally(() => requestCache.delete(cacheKey));
  return promise as Promise<T | null>;
}

/**
 * Fetch session results (race/qualifying standings)
 */
export async function getSessionResults(
  year: number,
  grandPrix: string,
  session: string
): Promise<SessionResult[]> {
  const results = await fetchTelemetryData<SessionResult[]>(
    year,
    grandPrix,
    session,
    'session_results'
  );
  return results || [];
}

/**
 * Fetch podium finishers (top 3)
 */
export async function getPodium(
  year: number,
  grandPrix: string,
  session: string
): Promise<PodiumDriver[]> {
  const podium = await fetchTelemetryData<PodiumDriver[]>(
    year,
    grandPrix,
    session,
    'podium'
  );
  return podium || [];
}

/**
 * Fetch fastest lap information
 */
export async function getFastestLap(
  year: number,
  grandPrix: string,
  session: string
): Promise<FastestLap | null> {
  const fastestLap = await fetchTelemetryData<FastestLap>(
    year,
    grandPrix,
    session,
    'fastest_lap'
  );

  if (!fastestLap) return null;

  return sanitizeNaN(fastestLap);
}

/**
 * Fetch session information (event details)
 */
export async function getSessionInfo(
  year: number,
  grandPrix: string,
  session: string
): Promise<SessionInfo | null> {
  return await fetchTelemetryData<SessionInfo>(
    year,
    grandPrix,
    session,
    'get_session_data'
  );
}

export async function getTrackDominance(
  year: number,
  grandPrix: string,
  session: string
): Promise<TrackDominanceData | null> {
  return fetchTelemetryData<TrackDominanceData>(
    year,
    grandPrix,
    session,
    'track_dominance'
  );
}

/**
 * Fetch tyre strategy data
 */
export async function getTyreStrategy(
  year: number,
  grandPrix: string,
  session: string
): Promise<TyreStintEntry[]> {
  const data = await fetchTelemetryData<TyreStintEntry[]>(
    year,
    grandPrix,
    session,
    'tyres'
  );
  return data || [];
}

/**
 * Fetch lap chart data (all lap times)
 */
export async function getLapChartData(
  year: number,
  grandPrix: string,
  session: string
): Promise<LapChartPayload | null> {
  return fetchTelemetryData<LapChartPayload>(
    year,
    grandPrix,
    session,
    'lap_chart_data'
  );
}

/**
 * Fetch available Grand Prix events for a given year
 */
export async function getGrandPrixOptions(year: number): Promise<GrandPrixOption[]> {
  try {
    // Fetch session data to get event dates for ordering
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('grand_prix, payload->EventDate, payload->Country')
      .eq('year', year)
      .eq('data_type', 'get_session_data');

    if (error) {
      console.error('Error fetching Grand Prix options:', error);
      return [];
    }

    const gpDateMap = new Map<string, { date: string; country: string }>();
    data.forEach((row) => {
      const { EventDate: eventDate, Country: country } = row as unknown as { grand_prix: string; EventDate: string; Country: string };
      if (eventDate && !gpDateMap.has(row.grand_prix)) {
        gpDateMap.set(row.grand_prix, { date: eventDate, country: country ?? '' });
      }
    });

    // Get unique grand prix events with their dates
    const gpWithDates = Array.from(gpDateMap.entries()).map(([gp, { date, country }]) => ({
      gp,
      date,
      country,
    }));

    // Sort by event date (chronological order)
    gpWithDates.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Return in schedule order
    return gpWithDates.map(({ gp, country }) => ({
      value: gp,
      label: gp,
      country,
    }));
  } catch (error) {
    console.error('Failed to fetch Grand Prix options:', error);
    return [];
  }
}

/**
 * Fetch available sessions for a given year and Grand Prix
 */
export async function getSessionOptions(
  year: number,
  grandPrix: string
): Promise<SessionOption[]> {
  try {
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('session')
      .eq('year', year)
      .eq('grand_prix', grandPrix);

    if (error) {
      console.error('Error fetching session options:', error);
      return [];
    }

    // Get unique session values
    const uniqueSessions = [...new Set(data.map((row) => row.session))];

    // Define race weekend order
    const sessionOrder: Record<string, number> = {
      'Practice 1': 1,
      'Practice 2': 2,
      'Practice 3': 3,
      'Sprint Qualifying': 4,
      'Sprint': 5,
      'Qualifying': 6,
      'Race': 7,
    };

    // Sort sessions by race weekend order
    uniqueSessions.sort((a, b) => {
      const orderA = sessionOrder[a] ?? 99;
      const orderB = sessionOrder[b] ?? 99;
      return orderA - orderB;
    });

    return uniqueSessions.map((session) => ({
      value: session,
      label: session,
    }));
  } catch (error) {
    console.error('Failed to fetch session options:', error);
    return [];
  }
}

export const AVAILABLE_YEARS: number[] = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
