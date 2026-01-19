import { createClient } from '@supabase/supabase-js';
import type { TelemetryDataRow } from '../types/telemetry';
import { validateUrl } from '../utils/sanitize';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate the Supabase URL to prevent SSRF attacks
try {
  validateUrl(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Validate the anon key format (basic check)
if (supabaseAnonKey.length < 100 || !supabaseAnonKey.startsWith('eyJ')) {
  throw new Error('Invalid Supabase anon key format');
}

// Create a single Supabase client instance with security options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist sessions in localStorage for security
    autoRefreshToken: false, // Disable auto-refresh since we're using anon key
  },
  global: {
    headers: {
      'X-Client-Info': 'telemetrics-frontend',
    },
  },
});

// Type-safe database schema
export type Database = {
  public: {
    Tables: {
      telemetry_data: {
        Row: TelemetryDataRow;
        Insert: TelemetryDataRow;
        Update: Partial<TelemetryDataRow>;
      };
    };
  };
};
