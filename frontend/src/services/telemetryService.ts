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
  PredictionPodiumDriver,
} from '../types/telemetry';
import { validateYear, validateGrandPrix, validateSession, validateDataType, RateLimiter } from '../utils/sanitize';
import { sanitizeNaN } from '../utils/formatters';

// Rate limiter: 60 requests per minute
const rateLimiter = new RateLimiter(60, 60000);

// Request cache: stores in-flight (and resolved) promises by cache key.
// Ensures multiple components requesting the same data fire only one network call.
const requestCache = new Map<string, Promise<unknown>>();

function assertRateLimitAvailable(): void {
  if (!rateLimiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded. Please try again in a moment.');
  }
  rateLimiter.recordRequest();
}

const SESSION_ORDER: Record<string, number> = {
  'Practice 1': 1,
  'Practice 2': 2,
  'Practice 3': 3,
  'Sprint Qualifying': 4,
  'Sprint': 5,
  'Qualifying': 6,
  'Race': 7,
};

type SessionRow = { year: number; grand_prix: string; session: string; EventDate: string };

function filterPastSessionRows(rows: SessionRow[]): SessionRow[] {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return rows.filter((r) => typeof r.EventDate === 'string' && new Date(r.EventDate) <= endOfToday);
}

function pickLatestGPRows(rows: SessionRow[]): SessionRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return new Date(b.EventDate).getTime() - new Date(a.EventDate).getTime();
  });
  const { year, EventDate: latestDate } = sorted[0];
  return rows.filter((r) => r.year === year && r.EventDate === latestDate);
}

function pickMostAdvancedSession(rows: SessionRow[]): SessionRow {
  return [...rows].sort(
    (a, b) => (SESSION_ORDER[b.session] ?? 0) - (SESSION_ORDER[a.session] ?? 0)
  )[0];
}

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
      assertRateLimitAvailable();

      const validatedYear = validateYear(year);
      const validatedGrandPrix = validateGrandPrix(grandPrix);
      const validatedSession = validateSession(session);
      const validatedDataType = validateDataType(dataType);

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

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Sort by event date (chronological order)
    gpWithDates.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const pastGPs = gpWithDates.filter(({ date }) => new Date(date) <= today);

    // Return in schedule order
    return pastGPs.map(({ gp, country }) => ({
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

    uniqueSessions.sort((a, b) => (SESSION_ORDER[a] ?? 99) - (SESSION_ORDER[b] ?? 99));

    return uniqueSessions.map((session) => ({
      value: session,
      label: session,
    }));
  } catch (error) {
    console.error('Failed to fetch session options:', error);
    return [];
  }
}

export async function getPredictionPodium(
  year: number,
  grandPrix: string,
  targetSession: string
): Promise<PredictionPodiumDriver[]> {
  const data = await fetchTelemetryData<PredictionPodiumDriver[]>(
    year,
    grandPrix,
    targetSession,
    'prediction_podium'
  );
  return data || [];
}

export const AVAILABLE_YEARS: number[] = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

export interface LatestSession {
  year: number;
  grandPrix: string;
  session: string;
}

const LATEST_SESSION_CACHE_KEY = '__latest_session__';

export async function getLatestSession(): Promise<LatestSession | null> {
  if (requestCache.has(LATEST_SESSION_CACHE_KEY)) {
    return requestCache.get(LATEST_SESSION_CACHE_KEY) as Promise<LatestSession | null>;
  }

  const promise = (async (): Promise<LatestSession | null> => {
    try {
      assertRateLimitAvailable();

      const { data, error } = await supabase
        .from('telemetry_data')
        .select('year, grand_prix, session, payload->>EventDate')
        .eq('data_type', 'get_session_data')
        .order('year', { ascending: false })
        .limit(200);

      if (error || !data || data.length === 0) return null;

      const rows = (data as unknown as SessionRow[]).filter(
        (r) => typeof r.EventDate === 'string' && typeof r.year === 'number'
      );
      if (rows.length === 0) return null;

      const past = filterPastSessionRows(rows);
      if (past.length === 0) return null;

      const { grand_prix: grandPrix, session, year } = pickMostAdvancedSession(pickLatestGPRows(past));
      return { year, grandPrix, session };
    } catch {
      return null;
    }
  })();

  requestCache.set(LATEST_SESSION_CACHE_KEY, promise);
  promise.finally(() => requestCache.delete(LATEST_SESSION_CACHE_KEY));
  return promise;
}

export interface LatestPrediction {
  year: number;
  grandPrix: string;
  session: string;
  drivers: PredictionPodiumDriver[];
}

const LATEST_PREDICTION_CACHE_KEY = '__latest_prediction__';

export async function getLatestPrediction(): Promise<LatestPrediction | null> {
  if (requestCache.has(LATEST_PREDICTION_CACHE_KEY)) {
    return requestCache.get(LATEST_PREDICTION_CACHE_KEY) as Promise<LatestPrediction | null>;
  }

  const promise = (async (): Promise<LatestPrediction | null> => {
    try {
      assertRateLimitAvailable();

      const { data: predictions, error } = await supabase
        .from('telemetry_data')
        .select('year, grand_prix, session, payload')
        .eq('data_type', 'prediction_podium')
        .order('year', { ascending: false });

      if (error || !predictions || predictions.length === 0) return null;

      const latestYear = predictions[0].year;
      const sameYear = predictions.filter((p) => p.year === latestYear);

      if (sameYear.length === 1) {
        const p = sameYear[0];
        return { year: p.year, grandPrix: p.grand_prix, session: p.session, drivers: p.payload as PredictionPodiumDriver[] };
      }

      const gpNames = sameYear.map((p) => p.grand_prix);
      const { data: sessionData } = await supabase
        .from('telemetry_data')
        .select('grand_prix, payload->>EventDate')
        .eq('year', latestYear)
        .eq('data_type', 'get_session_data')
        .in('grand_prix', gpNames);

      const dateMap = new Map<string, string>();
      (sessionData ?? []).forEach((r: unknown) => {
        const row = r as { grand_prix: string; EventDate: string };
        if (row.EventDate) dateMap.set(row.grand_prix, row.EventDate);
      });

      sameYear.sort((a, b) => {
        const rawA = dateMap.get(a.grand_prix);
        const rawB = dateMap.get(b.grand_prix);
        const tA = rawA ? new Date(rawA).getTime() : NaN;
        const tB = rawB ? new Date(rawB).getTime() : NaN;
        if (Number.isNaN(tA) && Number.isNaN(tB)) return 0;
        if (Number.isNaN(tA)) return 1;
        if (Number.isNaN(tB)) return -1;
        return tB - tA;
      });

      const latest = sameYear[0];
      return { year: latest.year, grandPrix: latest.grand_prix, session: latest.session, drivers: latest.payload as PredictionPodiumDriver[] };
    } catch (error) {
      console.error('Failed to fetch latest prediction:', error);
      return null;
    }
  })();

  requestCache.set(LATEST_PREDICTION_CACHE_KEY, promise);
  promise.finally(() => requestCache.delete(LATEST_PREDICTION_CACHE_KEY));
  return promise;
}
