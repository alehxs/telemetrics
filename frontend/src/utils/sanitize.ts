/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * Prevents XSS and injection attacks
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';

  // Remove any HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');

  // Encode special characters
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate year input
 */
export function validateYear(year: number | string): number {
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

  if (isNaN(yearNum)) {
    throw new Error('Invalid year: must be a number');
  }

  if (yearNum < 2018 || yearNum > 2030) {
    throw new Error('Invalid year: must be between 2018 and 2030');
  }

  return yearNum;
}

/**
 * Sanitize and validate Grand Prix name
 */
export function validateGrandPrix(grandPrix: string): string {
  if (!grandPrix || typeof grandPrix !== 'string') {
    throw new Error('Invalid Grand Prix: must be a non-empty string');
  }

  const sanitized = sanitizeString(grandPrix.trim());

  if (sanitized.length === 0 || sanitized.length > 100) {
    throw new Error('Invalid Grand Prix: length must be between 1 and 100 characters');
  }

  // Allow only alphanumeric, spaces, and basic punctuation
  if (!/^[a-zA-Z0-9\s\-']+$/.test(sanitized)) {
    throw new Error('Invalid Grand Prix: contains invalid characters');
  }

  return sanitized;
}

/**
 * Sanitize and validate session name
 */
export function validateSession(session: string): string {
  if (!session || typeof session !== 'string') {
    throw new Error('Invalid session: must be a non-empty string');
  }

  const sanitized = sanitizeString(session.trim());

  // Whitelist of valid session types
  const validSessions = [
    'Practice 1',
    'Practice 2',
    'Practice 3',
    'Qualifying',
    'Sprint Qualifying',
    'Sprint',
    'Race'
  ];

  if (!validSessions.includes(sanitized)) {
    throw new Error(`Invalid session: must be one of ${validSessions.join(', ')}`);
  }

  return sanitized;
}

/**
 * Sanitize and validate data type
 */
export function validateDataType(dataType: string): string {
  if (!dataType || typeof dataType !== 'string') {
    throw new Error('Invalid data type: must be a non-empty string');
  }

  const sanitized = sanitizeString(dataType.trim());

  // Whitelist of valid data types
  const validDataTypes = [
    'session_results',
    'podium',
    'fastest_lap',
    'get_session_data',
    'track_dominance',
    'tyres',
    'lap_chart_data'
  ];

  if (!validDataTypes.includes(sanitized)) {
    throw new Error(`Invalid data type: must be one of ${validDataTypes.join(', ')}`);
  }

  return sanitized;
}

/**
 * Sanitize object by encoding all string values
 * Deep sanitization for nested objects
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: must be a non-empty string');
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid URL: must use HTTPS protocol');
    }

    // Whitelist allowed domains
    const allowedDomains = ['supabase.co'];
    const isAllowed = allowedDomains.some(domain =>
      parsedUrl.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      throw new Error('Invalid URL: domain not allowed');
    }

    return url;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Rate limiting helper (client-side)
 * Prevents excessive API requests
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}
