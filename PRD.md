# Telemetrics - Product Requirements Document (PRD)

## Project Overview

**Telemetrics** is a Formula 1 telemetry visualization dashboard that displays race data, session results, lap times, tyre strategies, and track dominance visualizations for the 2024 F1 season.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Database**: Supabase (PostgreSQL + REST API)
- **Data Source**: FastF1 Python library
- **Visualization**: Chart.js
- **Deployment**: GitHub Pages (static site)

---

## Architecture Overview

```
┌─────────────────────┐
│   FastF1 API        │  Python library for F1 data
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Python Scripts     │  Fetch & process data
│  - scrapfile.py     │
│  - Custom scripts   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   JSON Files        │  Intermediate storage
│  (pre-computed)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Supabase DB       │  telemetry_data table
│   (PostgreSQL)      │  JSONB payload storage
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  React Frontend     │  Visualization dashboard
│  (TypeScript)       │  Chart.js components
└─────────────────────┘
```

---

## Data Pipeline

### Phase 1: Data Collection (Python/FastF1)

**Script Workflow:**
1. Query FastF1 API for specific year/Grand Prix/session
2. Extract relevant data:
   - Session results (position, driver, time, team)
   - Podium finishers (top 3)
   - Fastest lap (driver, time, tyre compound)
   - Track dominance (lap-by-lap fastest segments)
   - Tyre strategy (stint data per driver)
   - Lap chart data (all lap times)
   - Session metadata (location, date, total laps)
3. Transform to standardized JSON format
4. Save JSON files locally

**Data Types to Generate:**
```python
data_types = [
    'session_results',    # Race/qualifying results table
    'podium',            # Top 3 finishers
    'fastest_lap',       # Fastest lap info
    'track_dominance',   # Segment-by-segment fastest driver
    'tyres',             # Tyre compound per lap per driver
    'lap_chart_data',    # All lap times for chart
    'get_session_data'   # Event metadata
]
```

### Phase 2: Data Upload (JSON → Supabase)

**Upload Script Requirements:**
- Read JSON files from directory
- Parse year/grand_prix/session from filename or content
- Insert into Supabase `telemetry_data` table
- Handle duplicates (upsert if exists)

---

## Database Schema

### Table: `telemetry_data`

```sql
CREATE TABLE telemetry_data (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  grand_prix TEXT NOT NULL,
  session TEXT NOT NULL,
  data_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_telemetry_lookup
  ON telemetry_data(year, grand_prix, session, data_type);

CREATE INDEX idx_year
  ON telemetry_data(year);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_unique_telemetry
  ON telemetry_data(year, grand_prix, session, data_type);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for frontend)
CREATE POLICY "Allow anonymous read access"
  ON telemetry_data
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update (for data pipeline)
CREATE POLICY "Authenticated users can insert"
  ON telemetry_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── ErrorBoundary
│   ├── YearDropdown
│   ├── GrandPrixDropdown
│   ├── SessionDropdown
│   └── Content (when year/GP/session selected)
│       ├── SessionInfo
│       ├── Grid Layout
│       │   ├── Left Column
│       │   │   ├── Podium
│       │   │   ├── FastestLap
│       │   │   └── TrackDominance
│       │   └── Right Column
│       │       └── SessionResults
│       ├── TyreStrategy
│       └── LapsChart
```

### Data Layer

**Services** (`src/services/`)
- `supabase.ts` - Single Supabase client instance
- `telemetryService.ts` - All data fetching functions

**Hooks** (`src/hooks/`)
- `useTelemetryData.ts` - Custom hooks for each data type
  - Handles loading states
  - Error handling
  - Automatic refetch on dependency change

**Utils** (`src/utils/`)
- `formatters.ts` - Time/data formatting utilities
- `constants.ts` - Colors, SVG paths, team logos

**Types** (`src/types/`)
- `telemetry.ts` - All TypeScript interfaces
- `env.d.ts` - Environment variable types

---

## Data Payload Structures

### `session_results`
```typescript
[
  {
    Position: 1,
    Abbreviation: "VER",
    TeamName: "Red Bull Racing",
    TeamLogo: "url",
    TeamColor: "#3671C6",
    Status: "Finished",
    Time: "0 days 01:32:07.986"
  },
  // ... more drivers
]
```

### `podium`
```typescript
[
  {
    Position: 1,
    Abbreviation: "VER",
    TeamName: "Red Bull Racing",
    TeamColor: "#3671C6",
    HeadshotUrl: "url"
  },
  // top 3 only
]
```

### `fastest_lap`
```typescript
{
  Driver: "VER",
  LapTime: "0 days 00:01:29.708",
  LapNumber: 42,
  TyreAge: 12,
  TyreCompound: "SOFT"
}
```

### `get_session_data`
```typescript
{
  Country: "Monaco",
  Location: "Monte Carlo",
  EventName: "Monaco Grand Prix",
  EventDate: "2024-05-26",
  OfficialEventName: "FORMULA 1 GRAND PRIX DE MONACO 2024",
  TotalLaps: 78
}
```

### `track_dominance`
```typescript
{
  drivers: ["VER", "HAM", "LEC"],
  teamColors: ["#3671C6", "#27F4D2", "#E8002D"],
  segments: [
    {
      fastestDriver: "VER",
      points: [[0, 100], [1, 150], [2, 200]]  // [distance, position]
    },
    // ... more segments
  ]
}
```

### `tyres`
```typescript
[
  {
    Driver: "VER",
    Abbreviation: "VER",
    LapNumber: 1,
    Compound: "SOFT"
  },
  // ... one entry per lap per driver
]
```

### `lap_chart_data`
```typescript
{
  podium: ["VER", "HAM", "LEC"],
  laps: [
    {
      driver: "VER",
      lapNumber: 1,
      lapTime: "1:32.123"
    },
    // ... all laps for all drivers
  ]
}
```

---

## Feature Requirements

### Must-Have Features (MVP)
- [x] Year selection (dynamic from database)
- [x] Grand Prix selection (filtered by year)
- [x] Session selection (Race, Qualifying, etc.)
- [x] Session info display (location, date, laps)
- [x] Podium visualization (top 3 with team colors)
- [x] Session results table (all drivers)
- [x] Fastest lap display
- [x] Track dominance chart (scatter plot)
- [x] Tyre strategy chart (stacked bar)
- [x] Lap times chart (interactive zoom)
- [x] Error boundary for graceful failures
- [x] TypeScript for type safety
- [x] Responsive design (mobile-friendly)

### Nice-to-Have Features
- [ ] Multiple year support (2023, 2024, 2025)
- [ ] Driver comparison mode
- [ ] Download data as CSV/PDF
- [ ] Share specific race URL
- [ ] Dark/Light mode toggle
- [ ] Race highlights/notes section
- [ ] Weather data integration
- [ ] Pit stop visualization
- [ ] Team standings over season

---

## Data Collection Strategy

### Python Script Requirements

**Script: `populate_database.py`**

```python
# Pseudocode structure

import fastf1
from supabase import create_client

# Configuration
YEAR = 2024
GRAND_PRIX_LIST = [
    "Bahrain", "Saudi Arabia", "Australia",
    "Japan", "China", # ... all 24 races
]
SESSIONS = ["Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3"]

def fetch_session_data(year, gp, session):
    """Fetch data from FastF1 API"""
    # Load session
    session = fastf1.get_session(year, gp, session)
    session.load()

    # Extract all data types
    data = {
        'session_results': extract_results(session),
        'podium': extract_podium(session),
        'fastest_lap': extract_fastest_lap(session),
        'track_dominance': extract_track_dominance(session),
        'tyres': extract_tyre_data(session),
        'lap_chart_data': extract_lap_data(session),
        'get_session_data': extract_session_info(session)
    }

    return data

def save_to_json(data, year, gp, session):
    """Save to JSON file for backup"""
    filename = f"data/{year}_{gp}_{session}.json"
    with open(filename, 'w') as f:
        json.dump(data, f)

def upload_to_supabase(year, gp, session, data):
    """Upload each data type to Supabase"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    for data_type, payload in data.items():
        supabase.table('telemetry_data').upsert({
            'year': year,
            'grand_prix': gp,
            'session': session,
            'data_type': data_type,
            'payload': payload
        }, on_conflict='year,grand_prix,session,data_type').execute()

# Main loop
for gp in GRAND_PRIX_LIST:
    for session in SESSIONS:
        try:
            print(f"Processing {year} {gp} {session}...")
            data = fetch_session_data(YEAR, gp, session)
            save_to_json(data, YEAR, gp, session)
            upload_to_supabase(YEAR, gp, session, data)
        except Exception as e:
            print(f"Error: {e}")
            continue
```

---

## Environment Variables

### Frontend `.env`
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Backend/Scripts `.env`
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...  # Service role key for writes
```

---

## Deployment

### GitHub Pages Setup
1. Build: `npm run build`
2. Deploy: Push `dist/` to `gh-pages` branch
3. Base path: `/telemetrics/` (configured in vite.config.ts)

### Automated Deployment (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Current Issues to Fix

### 1. Missing Environment Variables ❌
- `.env` has old Django URL
- Missing `VITE_SUPABASE_URL`
- Missing `VITE_SUPABASE_ANON_KEY`

### 2. Empty Database ❌
- Supabase instance was deleted
- Need new Supabase project
- Need to re-populate data

### 3. Data Pipeline Not in Repo ❌
- Python scripts for FastF1 → JSON not in repo
- No documentation on data generation process
- No backup JSON files

### 4. Missing Dependencies
- Need to document exact FastF1 version
- Need requirements.txt for Python scripts

---

## Restoration Checklist

### Phase 1: Setup New Infrastructure
- [ ] Create new Supabase project
- [ ] Get Supabase URL and anon key
- [ ] Update frontend `.env` file
- [ ] Create `telemetry_data` table with schema
- [ ] Configure RLS policies

### Phase 2: Recreate Data Pipeline
- [ ] Create `backend/scripts/` directory
- [ ] Write `populate_database.py` script
- [ ] Write helper functions for each data type
- [ ] Create `requirements.txt` for Python dependencies
- [ ] Document FastF1 API usage

### Phase 3: Populate Database
- [ ] Run script for 2024 season races
- [ ] Verify data in Supabase dashboard
- [ ] Save JSON backups to `data/` directory
- [ ] Commit JSON files to repo (or exclude if too large)

### Phase 4: Test Frontend
- [ ] Verify dropdown population
- [ ] Test all visualizations
- [ ] Check error handling
- [ ] Mobile responsiveness testing

### Phase 5: Documentation
- [ ] Update README.md with setup instructions
- [ ] Document data pipeline process
- [ ] Add contribution guidelines
- [ ] Create data update procedure

---

## Success Metrics

- [ ] All 2024 races loaded in database
- [ ] Frontend loads without errors
- [ ] All charts render correctly
- [ ] Build succeeds with 0 TypeScript errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Page load time < 3 seconds
- [ ] No console errors in production

---

## Future Enhancements

### Multi-Season Support
- Add 2023, 2025 seasons
- Season comparison mode
- Historical trend analysis

### Advanced Visualizations
- 3D track map
- Animated race replay
- Sector time heatmaps
- G-force visualizations

### Data Enrichment
- Weather data per race
- Pit stop strategies
- Radio transcript highlights
- Post-race penalties

### User Features
- Favorite drivers
- Custom dashboard layouts
- Data export (CSV, PDF)
- Shareable race links

---

## Appendices

### A. FastF1 API Documentation
https://docs.fastf1.dev/

### B. Supabase Documentation
https://supabase.com/docs

### C. Chart.js Documentation
https://www.chartjs.org/docs/

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Author**: Alex (with Claude Code assistance)
