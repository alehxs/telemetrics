"""
Data Loader for Historical F1 Race Data

This module handles fetching and preparing historical F1 data from Supabase
for ML model training and evaluation. It retrieves session results, qualifying
data, and race outcomes from the telemetry_data table.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd
import logging
from datetime import datetime

# Add parent directory to path to import config
sys.path.append(str(Path(__file__).parent.parent))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

from ml_models.ml_config import (
    TRAINING_START_YEAR,
    TRAINING_END_YEAR,
    EXCLUDE_DNF_FROM_TRAINING,
    MIN_QUALIFYING_TIME,
    MAX_QUALIFYING_TIME,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class F1DataLoader:
    """
    Loads historical F1 data from Supabase for ML model training.

    Fetches data from the telemetry_data table which contains:
    - Session results (race finishing positions and times)
    - Qualifying results (grid positions and qualifying times)
    - Race metadata (year, grand prix, session type)
    """

    def __init__(self, supabase_url: str = SUPABASE_URL, supabase_key: str = SUPABASE_SERVICE_KEY):
        """Initialize Supabase client connection."""
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not found. Check your .env file.")

        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("✓ Supabase client initialized")

    def load_session_results(
        self,
        start_year: int = TRAINING_START_YEAR,
        end_year: int = TRAINING_END_YEAR,
        session_type: str = "Race"
    ) -> pd.DataFrame:
        """
        Load session results (race finishing data) from Supabase.

        Args:
            start_year: First year to fetch (inclusive)
            end_year: Last year to fetch (inclusive)
            session_type: Session type to fetch (default: "Race")

        Returns:
            DataFrame with columns:
                - year, grand_prix, session, driver_abbr, driver_name, team
                - position, race_time_seconds, status, points
        """
        logger.info(f"Loading {session_type} results for {start_year}-{end_year}...")

        try:
            response = self.client.table("telemetry_data") \
                .select("*") \
                .eq("data_type", "session_results") \
                .eq("session", session_type) \
                .gte("year", start_year) \
                .lte("year", end_year) \
                .order("year", desc=False) \
                .order("grand_prix", desc=False) \
                .execute()

            if not response.data:
                logger.warning(f"No {session_type} results found for {start_year}-{end_year}")
                return pd.DataFrame()

            # Extract data from JSONB payload
            records = []
            for row in response.data:
                year = row['year']
                grand_prix = row['grand_prix']
                session = row['session']
                payload = row.get('data_payload', {})

                # Extract results from payload
                if 'results' in payload:
                    for result in payload['results']:
                        records.append({
                            'year': year,
                            'grand_prix': grand_prix,
                            'session': session,
                            'driver_abbr': result.get('Abbreviation', ''),
                            'driver_name': result.get('FullName', ''),
                            'team': result.get('TeamName', ''),
                            'position': result.get('Position', None),
                            'race_time_seconds': result.get('Time_seconds', None),
                            'status': result.get('Status', ''),
                            'points': result.get('Points', 0),
                        })

            df = pd.DataFrame(records)

            # Data cleaning
            if not df.empty:
                # Convert position to numeric (handle non-finishers)
                df['position'] = pd.to_numeric(df['position'], errors='coerce')

                # Convert race time to numeric
                df['race_time_seconds'] = pd.to_numeric(df['race_time_seconds'], errors='coerce')

                # Filter out DNFs if configured
                if EXCLUDE_DNF_FROM_TRAINING:
                    initial_count = len(df)
                    df = df[df['race_time_seconds'].notna()]
                    logger.info(f"Excluded {initial_count - len(df)} DNF entries")

            logger.info(f"✓ Loaded {len(df)} {session_type} results")
            return df

        except Exception as e:
            logger.error(f"Error loading session results: {e}")
            raise

    def load_qualifying_data(
        self,
        start_year: int = TRAINING_START_YEAR,
        end_year: int = TRAINING_END_YEAR
    ) -> pd.DataFrame:
        """
        Load qualifying results from Supabase.

        Args:
            start_year: First year to fetch (inclusive)
            end_year: Last year to fetch (inclusive)

        Returns:
            DataFrame with columns:
                - year, grand_prix, driver_abbr, driver_name, team
                - qualifying_position, qualifying_time, q1_time, q2_time, q3_time
        """
        logger.info(f"Loading qualifying data for {start_year}-{end_year}...")

        try:
            response = self.client.table("telemetry_data") \
                .select("*") \
                .eq("data_type", "session_results") \
                .eq("session", "Qualifying") \
                .gte("year", start_year) \
                .lte("year", end_year) \
                .order("year", desc=False) \
                .order("grand_prix", desc=False) \
                .execute()

            if not response.data:
                logger.warning(f"No qualifying data found for {start_year}-{end_year}")
                return pd.DataFrame()

            # Extract qualifying data from JSONB payload
            records = []
            for row in response.data:
                year = row['year']
                grand_prix = row['grand_prix']
                payload = row.get('data_payload', {})

                if 'results' in payload:
                    for result in payload['results']:
                        # Get best qualifying time (Q3 > Q2 > Q1)
                        q1_time = result.get('Q1_seconds', None)
                        q2_time = result.get('Q2_seconds', None)
                        q3_time = result.get('Q3_seconds', None)

                        # Best time is the lowest available time
                        qualifying_time = None
                        if q3_time is not None:
                            qualifying_time = q3_time
                        elif q2_time is not None:
                            qualifying_time = q2_time
                        elif q1_time is not None:
                            qualifying_time = q1_time

                        records.append({
                            'year': year,
                            'grand_prix': grand_prix,
                            'driver_abbr': result.get('Abbreviation', ''),
                            'driver_name': result.get('FullName', ''),
                            'team': result.get('TeamName', ''),
                            'qualifying_position': result.get('Position', None),
                            'qualifying_time': qualifying_time,
                            'q1_time': q1_time,
                            'q2_time': q2_time,
                            'q3_time': q3_time,
                        })

            df = pd.DataFrame(records)

            # Data cleaning
            if not df.empty:
                # Convert to numeric
                df['qualifying_position'] = pd.to_numeric(df['qualifying_position'], errors='coerce')
                df['qualifying_time'] = pd.to_numeric(df['qualifying_time'], errors='coerce')

                # Filter invalid qualifying times
                initial_count = len(df)
                df = df[
                    (df['qualifying_time'] >= MIN_QUALIFYING_TIME) &
                    (df['qualifying_time'] <= MAX_QUALIFYING_TIME)
                ]
                if len(df) < initial_count:
                    logger.info(f"Filtered out {initial_count - len(df)} invalid qualifying times")

            logger.info(f"✓ Loaded {len(df)} qualifying results")
            return df

        except Exception as e:
            logger.error(f"Error loading qualifying data: {e}")
            raise

    def load_historical_races(
        self,
        start_year: int = TRAINING_START_YEAR,
        end_year: int = TRAINING_END_YEAR
    ) -> Dict[str, pd.DataFrame]:
        """
        Load all historical race data needed for ML training.

        Fetches both race results and qualifying data, then merges them
        to create a complete dataset for feature engineering.

        Args:
            start_year: First year to fetch (inclusive)
            end_year: Last year to fetch (inclusive)

        Returns:
            Dictionary with keys:
                - 'race_results': DataFrame with race finishing data
                - 'qualifying': DataFrame with qualifying data
                - 'merged': DataFrame with race and qualifying data merged
        """
        logger.info(f"Loading historical race data ({start_year}-{end_year})...")

        # Load race results and qualifying data
        race_results = self.load_session_results(start_year, end_year, "Race")
        qualifying = self.load_qualifying_data(start_year, end_year)

        # Merge race results with qualifying data
        merged = pd.DataFrame()
        if not race_results.empty and not qualifying.empty:
            merged = race_results.merge(
                qualifying[['year', 'grand_prix', 'driver_abbr', 'qualifying_position', 'qualifying_time']],
                on=['year', 'grand_prix', 'driver_abbr'],
                how='left'
            )
            logger.info(f"✓ Merged dataset: {len(merged)} records")

        return {
            'race_results': race_results,
            'qualifying': qualifying,
            'merged': merged,
        }

    def get_race_list(
        self,
        year: int
    ) -> List[str]:
        """
        Get list of Grand Prix names for a specific year.

        Args:
            year: Year to fetch races for

        Returns:
            List of Grand Prix names (e.g., ["Bahrain Grand Prix", "Saudi Arabian Grand Prix", ...])
        """
        try:
            response = self.client.table("telemetry_data") \
                .select("grand_prix") \
                .eq("year", year) \
                .eq("data_type", "session_results") \
                .eq("session", "Race") \
                .execute()

            if not response.data:
                logger.warning(f"No races found for {year}")
                return []

            # Extract unique grand prix names
            races = list(set([row['grand_prix'] for row in response.data]))
            races.sort()  # Alphabetical order

            logger.info(f"✓ Found {len(races)} races for {year}")
            return races

        except Exception as e:
            logger.error(f"Error fetching race list for {year}: {e}")
            return []


# ============================================================================
# Helper Functions
# ============================================================================

def load_training_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Convenience function to load all training data.

    Returns:
        Tuple of (features_df, target_series):
            - features_df: Historical data ready for feature engineering
            - target_series: NOT included (feature engineering extracts target)
    """
    loader = F1DataLoader()
    data = loader.load_historical_races()

    if data['merged'].empty:
        raise ValueError("No training data available")

    return data['merged'], data


def load_qualifying_for_prediction(year: int, grand_prix: str) -> pd.DataFrame:
    """
    Load qualifying data for a specific race (for prediction).

    Args:
        year: Year of the race
        grand_prix: Grand Prix name (e.g., "Bahrain Grand Prix")

    Returns:
        DataFrame with qualifying data for the specified race
    """
    loader = F1DataLoader()
    qualifying = loader.load_qualifying_data(year, year)

    if qualifying.empty:
        logger.warning(f"No qualifying data found for {year} {grand_prix}")
        return pd.DataFrame()

    # Filter for specific race
    race_qualifying = qualifying[
        (qualifying['year'] == year) &
        (qualifying['grand_prix'] == grand_prix)
    ]

    return race_qualifying


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    # Test data loading
    print("\n" + "=" * 70)
    print("F1 Data Loader Test")
    print("=" * 70 + "\n")

    loader = F1DataLoader()

    # Test 1: Load race results
    print("Test 1: Loading race results...")
    race_results = loader.load_session_results(2023, 2024)
    print(f"  → Loaded {len(race_results)} race results")
    if not race_results.empty:
        print(f"  → Columns: {', '.join(race_results.columns)}")
        print(f"  → Sample:\n{race_results.head(3)}\n")

    # Test 2: Load qualifying data
    print("Test 2: Loading qualifying data...")
    qualifying = loader.load_qualifying_data(2023, 2024)
    print(f"  → Loaded {len(qualifying)} qualifying results")
    if not qualifying.empty:
        print(f"  → Columns: {', '.join(qualifying.columns)}")
        print(f"  → Sample:\n{qualifying.head(3)}\n")

    # Test 3: Load merged historical data
    print("Test 3: Loading merged historical data...")
    data = loader.load_historical_races(2023, 2024)
    merged = data['merged']
    print(f"  → Merged dataset: {len(merged)} records")
    if not merged.empty:
        print(f"  → Columns: {', '.join(merged.columns)}")
        print(f"  → Sample:\n{merged.head(3)}\n")

    # Test 4: Get race list
    print("Test 4: Getting race list for 2024...")
    races = loader.get_race_list(2024)
    print(f"  → Found {len(races)} races")
    print(f"  → Races: {', '.join(races[:5])}...\n")

    print("=" * 70)
    print("✓ All tests completed")
    print("=" * 70)
