import { createClient } from '@supabase/supabase-js';
import type { TelemetryDataRow } from '../types/telemetry';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
