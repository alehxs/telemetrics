"""
Configuration for F1 data pipeline
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Years to process (2018-2025 = all FastF1 coverage)
YEARS = list(range(2018, 2026))

# Session types to fetch
SESSION_TYPES = [
    'Practice 1',
    'Practice 2',
    'Practice 3',
    'Qualifying',
    'Sprint Qualifying',
    'Sprint',
    'Race'
]

# Data types to generate
DATA_TYPES = [
    'session_results',
    'podium',
    'fastest_lap',
    'track_dominance',
    'tyres',
    'lap_chart_data',
    'get_session_data'
]

# File paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
LOGS_DIR = BASE_DIR / 'logs'
CACHE_DIR = BASE_DIR / 'cache'

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# Team name mappings (FastF1 → display name)
TEAM_MAPPINGS = {
    'Red Bull Racing': 'Red Bull Racing',
    'Mercedes': 'Mercedes',
    'Ferrari': 'Ferrari',
    'McLaren': 'McLaren',
    'Alpine F1 Team': 'Alpine',
    'AlphaTauri': 'Racing Bulls',
    'Aston Martin': 'Aston Martin',
    'Williams': 'Williams',
    'Alfa Romeo': 'Kick Sauber',
    'Haas F1 Team': 'Haas',
    # Historical teams
    'Racing Point': 'Aston Martin',
    'Renault': 'Alpine',
    'Toro Rosso': 'Racing Bulls',
    'Sauber': 'Kick Sauber',
}

# Driver headshot URL template (local path)
DRIVER_HEADSHOT_URL = "/telemetrics/driver_images/{driver}.png"

# Team logo path (matches frontend)
TEAM_LOGO_PATH = "/telemetrics/team_logos/{team}.png"
