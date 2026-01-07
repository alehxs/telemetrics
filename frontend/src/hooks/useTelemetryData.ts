/**
 * Custom React hooks for fetching telemetry data
 */

import { useEffect, useState } from 'react';
import type {
  SessionResult,
  PodiumDriver,
  FastestLap,
  SessionInfo,
  TrackDominanceDriver,
  TyreStintEntry,
  LapData,
  GrandPrixOption,
  SessionOption,
} from '../types/telemetry';
import * as telemetryService from '../services/telemetryService';

interface UseDataState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Generic hook for fetching telemetry data
 */
function useTelemetryData<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[],
  initialData: T
): UseDataState<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when dependencies change
    setLoading(true);
    setError(null);

    // Only fetch if all dependencies are truthy
    const shouldFetch = dependencies.every((dep) => {
      if (typeof dep === 'number') return dep > 0;
      if (typeof dep === 'string') return dep.length > 0;
      return Boolean(dep);
    });

    if (!shouldFetch) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    fetcher()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Hook for fetching session results
 */
export function useSessionResults(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<SessionResult[]> {
  return useTelemetryData(
    () => telemetryService.getSessionResults(year, grandPrix, session),
    [year, grandPrix, session],
    []
  );
}

/**
 * Hook for fetching podium data
 */
export function usePodium(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<PodiumDriver[]> {
  return useTelemetryData(
    () => telemetryService.getPodium(year, grandPrix, session),
    [year, grandPrix, session],
    []
  );
}

/**
 * Hook for fetching fastest lap
 */
export function useFastestLap(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<FastestLap | null> {
  return useTelemetryData(
    () => telemetryService.getFastestLap(year, grandPrix, session),
    [year, grandPrix, session],
    null
  );
}

/**
 * Hook for fetching session info
 */
export function useSessionInfo(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<SessionInfo | null> {
  return useTelemetryData(
    () => telemetryService.getSessionInfo(year, grandPrix, session),
    [year, grandPrix, session],
    null
  );
}

/**
 * Hook for fetching track dominance data
 */
export function useTrackDominance(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<TrackDominanceDriver[]> {
  return useTelemetryData(
    () => telemetryService.getTrackDominance(year, grandPrix, session),
    [year, grandPrix, session],
    []
  );
}

/**
 * Hook for fetching tyre strategy data
 */
export function useTyreStrategy(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<TyreStintEntry[]> {
  return useTelemetryData(
    () => telemetryService.getTyreStrategy(year, grandPrix, session),
    [year, grandPrix, session],
    []
  );
}

/**
 * Hook for fetching lap chart data
 */
export function useLapChartData(
  year: number,
  grandPrix: string,
  session: string
): UseDataState<LapData[]> {
  return useTelemetryData(
    () => telemetryService.getLapChartData(year, grandPrix, session),
    [year, grandPrix, session],
    []
  );
}

/**
 * Hook for fetching Grand Prix options
 */
export function useGrandPrixOptions(year: number): UseDataState<GrandPrixOption[]> {
  return useTelemetryData(
    () => telemetryService.getGrandPrixOptions(year),
    [year],
    []
  );
}

/**
 * Hook for fetching session options
 */
export function useSessionOptions(
  year: number,
  grandPrix: string
): UseDataState<SessionOption[]> {
  return useTelemetryData(
    () => telemetryService.getSessionOptions(year, grandPrix),
    [year, grandPrix],
    []
  );
}

/**
 * Hook for fetching available years
 */
export function useAvailableYears(): UseDataState<number[]> {
  return useTelemetryData(
    () => telemetryService.getAvailableYears(),
    [],
    [2024]
  );
}
