"""
FastF1 data extraction module

IMPORTANT NOTES:
- Full telemetry data only available for 2018+ seasons
- Ergast API deprecated (end of 2024) - using Jolpica-F1 replacement
- Sprint Qualifying format changed in 2024 (race format → qualifying format)
- Tyre compounds shown as SOFT/MEDIUM/HARD (C-numbers not available via API)
"""
import fastf1
import pandas as pd
import logging
from typing import Optional, Dict, Any
from config import CACHE_DIR, USE_JOLPICA_F1_API, JOLPICA_F1_BASE_URL

# Enable FastF1 cache
fastf1.Cache.enable_cache(str(CACHE_DIR))

# Configure Ergast API replacement (Jolpica-F1)
if USE_JOLPICA_F1_API:
    try:
        fastf1.ergast.interface.BASE_URL = JOLPICA_F1_BASE_URL
        logging.info(f"Using Jolpica-F1 API: {JOLPICA_F1_BASE_URL}")
    except Exception as e:
        logging.warning(f"Failed to configure Jolpica-F1 API: {e}")

logger = logging.getLogger(__name__)


class FastF1Extractor:
    """Extract data from FastF1 API

    Handles year-specific data differences:
    - 2021-2022: Sprint Qualifying = race format (no Q1/Q2/Q3)
    - 2024+: Sprint Qualifying = qualifying format (has Q1/Q2/Q3)
    - 2022: Potential server infrastructure issues
    """

    def __init__(self, year: int, grand_prix: str, session_type: str):
        self.year = year
        self.grand_prix = grand_prix
        self.session_type = session_type
        self.session = None
        self.is_sprint_qualifying = session_type in ['Sprint Qualifying', 'SQ']

    def _is_qualifying_format_sprint(self) -> bool:
        """Check if Sprint Qualifying uses qualifying format (2024+) vs race format (2021-2022)"""
        return self.is_sprint_qualifying and self.year >= 2024

    def load_session(self, max_retries: int = 3, retry_delay: int = 5) -> bool:
        """Load session data from FastF1 with retry logic

        Args:
            max_retries: Maximum number of retry attempts
            retry_delay: Delay in seconds between retries

        Returns:
            bool: True if session loaded successfully
        """
        import time

        for attempt in range(max_retries):
            try:
                logger.info(f"Loading {self.year} {self.grand_prix} {self.session_type}... (attempt {attempt + 1}/{max_retries})")
                self.session = fastf1.get_session(self.year, self.grand_prix, self.session_type)
                self.session.load()
                logger.info(f"Session loaded successfully")

                # Log format detection for Sprint Qualifying
                if self.is_sprint_qualifying:
                    format_type = "qualifying format (Q1/Q2/Q3)" if self._is_qualifying_format_sprint() else "race format"
                    logger.info(f"Sprint Qualifying detected: {format_type}")

                return True
            except Exception as e:
                logger.warning(f"Failed to load session (attempt {attempt + 1}/{max_retries}): {e}")

                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Failed to load session after {max_retries} attempts: {e}")
                    return False

    def get_results(self) -> pd.DataFrame:
        """Get session results (standings)"""
        if not self.session:
            raise ValueError("Session not loaded")
        return self.session.results

    def get_laps(self) -> pd.DataFrame:
        """Get all laps data"""
        if not self.session:
            raise ValueError("Session not loaded")
        return self.session.laps

    def get_event_info(self) -> Dict[str, Any]:
        """Get event metadata"""
        if not self.session:
            raise ValueError("Session not loaded")

        event = self.session.event
        return {
            'Country': event.Country,
            'Location': event.Location,
            'EventName': event.EventName,
            'EventDate': str(event.EventDate.date()) if hasattr(event.EventDate, 'date') else str(event.EventDate),
            'OfficialEventName': event.OfficialEventName,
        }

    def get_fastest_lap(self) -> Optional[pd.Series]:
        """Get fastest lap of the session"""
        if not self.session:
            raise ValueError("Session not loaded")

        laps = self.session.laps
        if laps.empty:
            return None

        # Filter out invalid laps
        valid_laps = laps[laps['LapTime'].notna()]
        if valid_laps.empty:
            return None

        fastest = valid_laps.loc[valid_laps['LapTime'].idxmin()]
        return fastest

    def get_driver_standings(self) -> pd.DataFrame:
        """Get driver standings (positions)"""
        if not self.session:
            raise ValueError("Session not loaded")

        results = self.session.results.copy()

        # Check if we have valid position data from API
        has_valid_positions = results['Position'].notna().any()

        if not has_valid_positions:
            # No valid positions from API - compute from lap data
            logger.info("Computing standings from lap data (no API position data available)")

            laps = self.session.laps
            if laps.empty:
                logger.warning("No lap data available")
                return results.sort_values('DriverNumber')

            # For practice/qualifying: rank by fastest lap
            # For race: use final classification from lap data
            if self.session_type in ['Race', 'Sprint']:
                # For races, try to get finishing order from last lap
                final_laps = laps[laps['LapNumber'] == laps['LapNumber'].max()]
                if not final_laps.empty:
                    # Use position from last lap
                    for idx, row in results.iterrows():
                        driver_final = final_laps[final_laps['Driver'] == row['Abbreviation']]
                        if not driver_final.empty:
                            results.at[idx, 'Position'] = driver_final.iloc[0].get('Position', 999)
            else:
                # For practice/qualifying: rank by fastest lap time
                fastest_laps = []
                for _, driver_row in results.iterrows():
                    driver_abbr = driver_row['Abbreviation']
                    driver_laps = laps[laps['Driver'] == driver_abbr]

                    if not driver_laps.empty:
                        valid_laps = driver_laps[driver_laps['LapTime'].notna()]
                        if not valid_laps.empty:
                            fastest_time = valid_laps['LapTime'].min()
                            fastest_laps.append({
                                'Abbreviation': driver_abbr,
                                'BestLapTime': fastest_time
                            })

                if fastest_laps:
                    # Sort by fastest lap time
                    fastest_df = pd.DataFrame(fastest_laps).sort_values('BestLapTime')

                    # Assign positions based on fastest lap
                    for position, (_, lap_row) in enumerate(fastest_df.iterrows(), start=1):
                        abbr = lap_row['Abbreviation']
                        results.loc[results['Abbreviation'] == abbr, 'Position'] = position
                        results.loc[results['Abbreviation'] == abbr, 'Time'] = lap_row['BestLapTime']

        # Sort by position
        results = results.sort_values('Position')
        return results

    def get_telemetry_for_driver(self, driver_number: str) -> Optional[pd.DataFrame]:
        """Get telemetry data for specific driver"""
        if not self.session:
            raise ValueError("Session not loaded")

        try:
            driver_laps = self.session.laps.pick_driver(driver_number)
            if driver_laps.empty:
                return None
            return driver_laps
        except Exception as e:
            logger.warning(f"Could not get telemetry for driver {driver_number}: {e}")
            return None

    def get_qualifying_results(self) -> Optional[pd.DataFrame]:
        """Get qualifying results with Sprint Qualifying format awareness

        Returns:
            DataFrame with qualifying results, or None if not a qualifying session

        Notes:
            - 2021-2022 Sprint Qualifying: No Q1/Q2/Q3 times (race format)
            - 2024+ Sprint Qualifying: Has Q1/Q2/Q3 times (qualifying format)
        """
        if not self.session:
            raise ValueError("Session not loaded")

        # Only return qualifying data for qualifying-type sessions
        if self.session_type not in ['Qualifying', 'Sprint Qualifying', 'SQ', 'Q']:
            logger.warning(f"Session type {self.session_type} is not a qualifying session")
            return None

        try:
            results = self.session.results.copy()

            # Check if Q1/Q2/Q3 times exist (qualifying format)
            has_q_times = any(col in results.columns for col in ['Q1', 'Q2', 'Q3'])

            if self.is_sprint_qualifying and not has_q_times and self.year >= 2024:
                logger.warning(f"Expected Q1/Q2/Q3 times for {self.year} Sprint Qualifying but none found")

            if self.is_sprint_qualifying and has_q_times and self.year < 2024:
                logger.warning(f"Unexpected Q1/Q2/Q3 times for {self.year} Sprint Qualifying (should be race format)")

            return results

        except Exception as e:
            logger.error(f"Failed to get qualifying results: {e}")
            return None
