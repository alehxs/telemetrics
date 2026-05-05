/**
 * Constants used throughout the application
 */

import type { TyreCompound } from '../types/telemetry';

/**
 * Tyre compound color mapping
 */
export const TYRE_COMPOUND_COLORS: Record<TyreCompound, string> = {
  SOFT: '#C8384C',
  MEDIUM: '#C49820',
  HARD: '#D4D4D4',
  INTERMEDIATE: '#30A860',
  WET: '#3070C0',
  UNKNOWN: '#7A7A8A',
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
 * Fallback color palette for drivers with no known team color.
 * Assigned in order at data-load time so colors stay stable across re-renders.
 */
export const DRIVER_FALLBACK_PALETTE = [
  '#A8A8A8', '#D4A843', '#7B68EE', '#20B2AA',
  '#FF7F50', '#98FB98', '#DDA0DD', '#F0E68C',
];

/**
 * Default year (can be updated when more years are added)
 */
export const DEFAULT_YEAR = 2024;

/**
 * Team logo base path
 */
export const TEAM_LOGO_BASE_PATH = '/telemetrics/team_logos/';

/**
 * Get team logo path
 */
export function getTeamLogoPath(teamName: string): string {
  const formattedName = teamName.toLowerCase().replace(/\s+/g, '_');
  return `${TEAM_LOGO_BASE_PATH}${formattedName}.png`;
}

/**
 * Driver headshot base path
 */
export const DRIVER_HEADSHOT_BASE_PATH = '/telemetrics/driver_images/';

/**
 * Get driver headshot path (local images)
 */
export function getDriverHeadshotPath(driverAbbreviation: string): string {
  return `${DRIVER_HEADSHOT_BASE_PATH}${driverAbbreviation.toUpperCase()}.png`;
}

export function adjustColorLightness(hexColor: string, amount: number): string {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const newL = Math.min(1, Math.max(0, l + amount / 100));

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let nr: number, ng: number, nb: number;
  if (s === 0) {
    nr = ng = nb = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
    const p = 2 * newL - q;
    nr = hue2rgb(p, q, h + 1/3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
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
 * Country name to ISO 3166-1 alpha-2 code mapping for F1 Grand Prix locations
 */
export const COUNTRY_CODES: Record<string, string> = {
  'Bahrain': 'BH',
  'Saudi Arabia': 'SA',
  'Australia': 'AU',
  'Azerbaijan': 'AZ',
  'USA': 'US',
  'United States': 'US',
  'Italy': 'IT',
  'Monaco': 'MC',
  'Spain': 'ES',
  'Canada': 'CA',
  'Austria': 'AT',
  'Great Britain': 'GB',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Hungary': 'HU',
  'Belgium': 'BE',
  'Netherlands': 'NL',
  'Singapore': 'SG',
  'Japan': 'JP',
  'Qatar': 'QA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Abu Dhabi': 'AE',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
  'China': 'CN',
  'France': 'FR',
  'Germany': 'DE',
  'Russia': 'RU',
  'Turkey': 'TR',
  'Portugal': 'PT',
  'India': 'IN',
  'Malaysia': 'MY',
  'Korea': 'KR',
  'South Korea': 'KR',
  'Argentina': 'AR',
  'South Africa': 'ZA',
  'Morocco': 'MA',
};

/**
 * Get ISO 3166-1 alpha-2 country code for a country name
 */
export function getCountryCode(country: string): string {
  return COUNTRY_CODES[country] ?? '';
}
