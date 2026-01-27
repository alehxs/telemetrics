"""
Configuration for F1 data pipeline
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Validate required environment variables
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY")
    raise ValueError("Missing required Supabase credentials. Check your .env file.")

# Validate URL format
if not SUPABASE_URL.startswith('https://'):
    logger.error("SUPABASE_URL must use HTTPS protocol")
    raise ValueError("Invalid SUPABASE_URL: must use HTTPS protocol")

# Validate URL domain
if not SUPABASE_URL.endswith('.supabase.co'):
    logger.warning(f"Unexpected Supabase URL domain: {SUPABASE_URL}")

# Validate service key format (basic check)
if not SUPABASE_SERVICE_KEY.startswith('eyJ') or len(SUPABASE_SERVICE_KEY) < 100:
    logger.error("Invalid SUPABASE_SERVICE_KEY format")
    raise ValueError("Invalid SUPABASE_SERVICE_KEY format")

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

# FastF1 API Configuration
# Ergast API shut down at end of 2024 - use Jolpica-F1 as replacement
# Set to True to use Jolpica-F1 API instead of deprecated Ergast API
USE_JOLPICA_F1_API = os.getenv('USE_JOLPICA_F1_API', 'true').lower() == 'true'
JOLPICA_F1_BASE_URL = "https://api.jolpi.ca/ergast/f1"

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
