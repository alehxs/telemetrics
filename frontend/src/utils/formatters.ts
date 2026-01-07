/**
 * Utility functions for formatting telemetry data
 */

import type { Driver } from '../types/telemetry';

/**
 * Format leader time (race winner's time)
 * Removes leading zeros and formats to mm:ss.SSS
 */
export function formatLeaderTime(time: string | null | undefined): string {
  if (!time) return 'N/A';

  const formattedTime = time.replace(/0 days\s|^00:/g, '').split('.');
  const timeWithoutLeadingZeros = formattedTime[0]
    .replace(/^0:0/, '')
    .replace(/^0:/, '');

  return `${timeWithoutLeadingZeros}.${formattedTime[1]?.slice(0, 3) || '000'}`;
}

/**
 * Format interval time (gap to leader)
 * Converts to +seconds.milliseconds format
 */
export function formatIntervalTime(time: string | null | undefined): string {
  if (!time) return 'N/A';

  const match = time.match(/(\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (!match) return 'N/A';

  const [, hours, minutes, seconds] = match;
  const totalSeconds =
    parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);

  return `+${totalSeconds.toFixed(3)}`;
}

/**
 * Get display time for a driver based on their status
 * Handles finished, DNF, and lapped drivers
 */
export function getDisplayTime(
  driver: Driver,
  leaderTime: string | null,
  isLeader: boolean
): string {
  const { Status, Time } = driver;

  // Handle lapped drivers
  if (Status.includes('+')) {
    const match = Status.match(/\+(\d+) Lap/);
    if (match) {
      const laps = parseInt(match[1]);
      return `+${laps} Lap${laps > 1 ? 's' : ''}`;
    }
  }

  // Handle DNF (Did Not Finish)
  if (Status !== 'Finished') {
    return 'DNF';
  }

  // Format time based on position
  return isLeader ? formatLeaderTime(Time) : formatIntervalTime(Time);
}

/**
 * Format event date to readable format (e.g., "Mar 15")
 */
export function formatEventDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown Date';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Unknown Date';
  }
}

/**
 * Format lap time from seconds to mm:ss.SSS
 */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
}

/**
 * Sanitize JSON string containing NaN values
 */
export function sanitizeNaN<T>(data: T): T {
  const jsonString = JSON.stringify(data).replace(/\bNaN\b/g, 'null');
  return JSON.parse(jsonString) as T;
}
