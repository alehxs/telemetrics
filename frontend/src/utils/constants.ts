/**
 * Constants used throughout the application
 */

import type { TyreCompound } from '../types/telemetry';

/**
 * Tyre compound color mapping
 */
export const TYRE_COMPOUND_COLORS: Record<TyreCompound, string> = {
  SOFT: '#FF1E1E',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#00C16E',
  WET: '#007BFF',
  UNKNOWN: '#999999',
};

/**
 * F1 brand colors
 */
export const F1_COLORS = {
  RED: '#E10600',
  BLACK: '#15151E',
  WHITE: '#FFFFFF',
  FASTEST_LAP: '#AE38E0',
} as const;

/**
 * SVG paths for icons
 */
export const SVG_PATHS = {
  FASTEST_LAP: 'svgs/fastestlap.svg',
  SOFT_TYRE: 'svgs/softtyre.svg',
  MEDIUM_TYRE: 'svgs/mediumtyre.svg',
  HARD_TYRE: 'svgs/hardtyre.svg',
  INTERMEDIATE_TYRE: 'svgs/intermediatetyre.svg',
  WET_TYRE: 'svgs/wettyre.svg',
} as const;

/**
 * Get tyre SVG path based on compound
 */
export function getTyreSvgPath(compound: TyreCompound): string {
  const compoundLower = compound.toLowerCase();
  return `svgs/${compoundLower}tyre.svg`;
}

/**
 * Default year (can be updated when more years are added)
 */
export const DEFAULT_YEAR = 2024;

/**
 * Team logo base path
 */
export const TEAM_LOGO_BASE_PATH = '/telemetrics/src/assets/team_logos/';

/**
 * Get team logo path
 */
export function getTeamLogoPath(teamName: string): string {
  const formattedName = teamName.toLowerCase().replace(/\s+/g, '-');
  return `${TEAM_LOGO_BASE_PATH}${formattedName}.png`;
}

/**
 * Adjust team color brightness for better readability
 */
export function adjustTeamColor(hexColor: string, amount: number = 30): string {
  // Remove # if present
  const color = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust brightness
  const newR = Math.min(255, Math.max(0, r + amount));
  const newG = Math.min(255, Math.max(0, g + amount));
  const newB = Math.min(255, Math.max(0, b + amount));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Country to flag emoji mapping for F1 Grand Prix locations
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  // 2024 Season
  'Bahrain': '🇧🇭',
  'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺',
  'Azerbaijan': '🇦🇿',
  'USA': '🇺🇸',
  'Italy': '🇮🇹',
  'Monaco': '🇲🇨',
  'Spain': '🇪🇸',
  'Canada': '🇨🇦',
  'Austria': '🇦🇹',
  'Great Britain': '🇬🇧',
  'UK': '🇬🇧',
  'Hungary': '🇭🇺',
  'Belgium': '🇧🇪',
  'Netherlands': '🇳🇱',
  'Singapore': '🇸🇬',
  'Japan': '🇯🇵',
  'Qatar': '🇶🇦',
  'Mexico': '🇲🇽',
  'Brazil': '🇧🇷',
  'Las Vegas': '🇺🇸',
  'Abu Dhabi': '🇦🇪',
  'UAE': '🇦🇪',

  // Historical locations
  'China': '🇨🇳',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Russia': '🇷🇺',
  'Turkey': '🇹🇷',
  'Portugal': '🇵🇹',
  'India': '🇮🇳',
  'Malaysia': '🇲🇾',
  'Korea': '🇰🇷',
  'South Korea': '🇰🇷',
  'Argentina': '🇦🇷',
  'South Africa': '🇿🇦',
  'Morocco': '🇲🇦',
} as const;

/**
 * Get country flag emoji for a country name
 */
export function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country] || '🏁';
}
