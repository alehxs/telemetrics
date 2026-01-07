// Core telemetry data types for Formula 1 data

export interface Driver {
  Position: number;
  Abbreviation: string;
  TeamName: string;
  TeamLogo?: string;
  TeamColor?: string;
  Status: string;
  Time: string;
  HeadshotUrl?: string;
}

export interface SessionResult extends Driver {
  DriverNumber?: string;
  Points?: number;
}

export interface PodiumDriver extends Driver {
  HeadshotUrl: string;
  TeamColor: string;
}

export interface FastestLap {
  Driver: string;
  LapTime: string;
  LapNumber: number;
  TyreAge: number;
  TyreCompound: TyreCompound;
}

export interface SessionInfo {
  Country: string;
  Location: string;
  EventName: string;
  EventDate: string;
  OfficialEventName: string;
  TotalLaps: number | string;
}

export interface TrackDominancePoint {
  x: number;
  y: number;
}

export interface TrackDominanceDriver {
  driver: string;
  team: string;
  color: string;
  data: TrackDominancePoint[];
}

export interface TyreStintEntry {
  Driver: string;
  Stint: number;
  Compound: TyreCompound;
  LapStart: number;
  LapEnd: number;
  StintLength: number;
  TyreLife: number;
}

export interface LapData {
  Driver: string;
  LapNumber: number;
  LapTime: number;
  LapTimeString: string;
  Compound?: TyreCompound;
}

// Tyre compound types
export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';

// Data type identifiers in Supabase
export type DataType =
  | 'session_results'
  | 'podium'
  | 'fastest_lap'
  | 'track_dominance'
  | 'tyres'
  | 'lap_chart_data'
  | 'get_session_data';

// Supabase row structure
export interface TelemetryDataRow<T = unknown> {
  year: number;
  grand_prix: string;
  session: string;
  data_type: DataType;
  payload: T;
}

// Selection options for dropdowns
export interface GrandPrixOption {
  value: string;
  label: string;
}

export interface SessionOption {
  value: string;
  label: string;
}

export interface YearOption {
  value: number;
  label: string;
}

// Component prop types
export interface TelemetryComponentProps {
  year: number;
  grandPrix: string;
  session: string;
}

export interface DropdownProps {
  options: Array<{ value: string | number; label: string }>;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
}
