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

export interface TrackDominanceSegment {
  fastestDriver: string;
  points: Array<[number, number]>;
}

export interface TrackDominanceData {
  drivers: string[];
  teamColors: string[];
  segments: TrackDominanceSegment[];
}

export interface TyreStintEntry {
  Driver: string;
  Abbreviation: string;
  LapNumber: number;
  Compound: TyreCompound;
}

export interface LapData {
  driver: string;
  lapNumber: number;
  lapTime: string;
}

export interface LapChartPayload {
  laps: LapData[];
  podium: string[];
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
  country: string;
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
