# Telemetrics - F1 Telemetry Visualization Dashboard

TypeScript-powered React application for visualizing Formula 1 telemetry data, lap times, tyre strategies, and track dominance.

![Formula 1](https://img.shields.io/badge/Formula%201-2024-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## 🏎️ Features

- **Session Results** - Race and qualifying standings with gap to leader
- **Podium Display** - Top 3 finishers with driver photos
- **Fastest Lap** - Fastest lap with tyre compound and age
- **Track Dominance** - Fastest driver per track segment (top 2 finishers)
- **Tyre Strategy** - Stacked bar chart of tyre usage per driver
- **Lap Times Chart** - Interactive zoomable chart of all lap times
- **Responsive Design** - Desktop, tablet, and mobile support

![Dashboard Overview](./docs/screenshots/dashboard.png)
*Full dashboard view showing all telemetry components*

## ⚠️ Data Availability & Limitations

### Timeline-Based Data Coverage

**Full Data (2018-2025):**
- Complete telemetry (speed, RPM, gear, position, DRS)
- Weather data (updated per minute)
- Lap timing and position data
- Tyre compound information
- Data available 30-120 minutes post-session

**Limited Data (Pre-2018):**
- No telemetry, weather, or position data
- Only basic session results (via Ergast API)

### Known Limitations

- **Tyre Compounds**: API provides SOFT/MEDIUM/HARD labels only (not C-numbers like C1-C5)
- **Sprint Qualifying**: Format changed in 2024 (2021-2022: race format, 2024+: qualifying format)
- **API**: Using Jolpica-F1 replacement for deprecated Ergast API
- **2022 Data**: Some sessions have infrastructure issues (retry logic enabled)

> For detailed technical information, see inline documentation in `backend/scripts/data_transformers.py` and `fastf1_extractor.py`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase account (free tier works)
- Python 3.8+ (optional, only for data pipeline)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/telemetrics.git
cd telemetrics
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

### 3. Configure Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Setup Database

In your Supabase SQL Editor, run:

```sql
CREATE TABLE telemetry_data (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  grand_prix TEXT NOT NULL,
  session TEXT NOT NULL,
  data_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_telemetry
  ON telemetry_data(year, grand_prix, session, data_type);
```

> See `backend/setup_database.sql` for full schema with RLS policies

### 5. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:5173/telemetrics/

### 6. Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 🛠️ Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite 6** - Build tool & dev server
- **Tailwind CSS 3.4** - Styling
- **Chart.js 4.4** - Zoom & datalabels plugins
- **Supabase** - Real-time database

### Backend & Data
- **Python 3.8+** with FastF1 library
- **Supabase (PostgreSQL)** - Database + REST API
- **Pandas & NumPy** - Data processing

### Data Flow
```
FastF1 API → Python Pipeline → Supabase (JSONB) → React Frontend
   2018-2025     Transform      Real-time DB       Interactive UI
```

## 📊 Data Pipeline (Optional)

Fetches F1 telemetry from FastF1 (2018-2025) and stores it in Supabase.

### Setup Python Environment

```bash
pip install -r requirements.txt
cd backend
cp .env.example .env
```

Edit `backend/.env` with your Supabase **service role** key:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here  # NOT the anon key!
```

### Run Pipeline

**Test with single session (recommended first):**
```bash
cd backend/scripts
python main_pipeline.py --year 2024 --gp "Monaco" --session "Race"
```

**Full pipeline (all years 2018-2025):**
Takes 6-8 hours, processes ~576 sessions
```bash
python main_pipeline.py
```

**Filter options:**
```bash
python main_pipeline.py --year 2024 --gp "Monaco" --session "Race"  # Filters: year, GP, session
```

### Data Types Generated

Pipeline generates 7 data types per session:

| Data Type | Component | Description |
|-----------|-----------|-------------|
| `session_results` | SessionResults | All driver standings |
| `podium` | Podium | Top 3 finishers with photos |
| `fastest_lap` | FastestLap | Fastest lap with tyre info |
| `get_session_data` | SessionInfo | Event metadata (location, date) |
| `track_dominance` | TrackDominance | Top 2 finishers' segment data |
| `tyres` | TyreStrategy | Tyre compounds per lap |
| `lap_chart_data` | LapsChart | All lap times for visualization |

> Detailed docs: See [PRD.md](PRD.md) for complete data schemas and transformation logic

## 🏗️ Project Structure

```
telemetrics/
├── frontend/
│   ├── src/
│   │   ├── components/         # React UI components (.tsx)
│   │   ├── hooks/              # Custom data hooks
│   │   ├── services/           # Supabase queries
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # Formatters & constants
│   │   └── App.tsx             # Main component
│   ├── package.json
│   └── vite.config.ts          # Base path: /telemetrics/
├── backend/
│   ├── scripts/
│   │   ├── main_pipeline.py    # Orchestrator + CLI
│   │   ├── config.py           # Years, sessions, teams
│   │   ├── fastf1_extractor.py # FastF1 API wrapper
│   │   ├── data_transformers.py # Transform logic
│   │   └── supabase_uploader.py # DB uploads
│   ├── data/                   # JSON backups (auto-created)
│   └── setup_database.sql      # Database schema
├── requirements.txt            # Python dependencies
├── PRD.md                      # Full specifications
└── README.md                   # This file
```

## 🔧 Available Commands

**Frontend:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run deploy       # Deploy to GitHub Pages
```

**Backend:**
```bash
python main_pipeline.py                # Full pipeline (2018-2025)
python main_pipeline.py --year 2024    # Single year
python main_pipeline.py --gp "Monaco"  # Specific Grand Prix
```

## 🌐 Deployment

### GitHub Pages

Update `vite.config.ts` with your repo name, then build and deploy:

```bash
npm run build
npm run deploy
```

Site: `https://username.github.io/your-repo-name/`

## 🐛 Troubleshooting

**Frontend:**
- **Dropdowns empty** - Check `.env` credentials, verify table has data
- **Charts not rendering** - Verify data schemas (see PRD.md), check Chart.js plugins
- **Build fails** - Run `npm install`, check `npx tsc --noEmit`

**Backend Pipeline:**
- **Credentials error** - Use service role key (not anon key) in `backend/.env`
- **Session load failures** - Some sessions lack FastF1 data, pipeline auto-skips
- **Slow performance** - First run caches locally (~30-60s per session)

## 📚 Documentation

- [PRD.md](PRD.md) - Complete Product Requirements
- [FastF1 Docs](https://docs.fastf1.dev/) - Data source API
- [Supabase Docs](https://supabase.com/docs) - Database documentation
- [Chart.js Docs](https://www.chartjs.org/docs/) - Visualization library

## 🤝 Contributing

Fork the repository, create a feature branch, commit changes, and open a Pull Request.

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [FastF1](https://github.com/theOehrly/Fast-F1) - F1 data library
- [Supabase](https://supabase.com) - Backend-as-a-service
- Formula 1

---

**Built for F1 fans**
