"""
FastF1 data extraction module
"""
import fastf1
import pandas as pd
import logging
from typing import Optional, Dict, Any
from config import CACHE_DIR

# Enable FastF1 cache
fastf1.Cache.enable_cache(str(CACHE_DIR))

logger = logging.getLogger(__name__)


class FastF1Extractor:
    """Extract data from FastF1 API"""

    def __init__(self, year: int, grand_prix: str, session_type: str):
        self.year = year
        self.grand_prix = grand_prix
        self.session_type = session_type
        self.session = None

    def load_session(self) -> bool:
        """Load session data from FastF1"""
        try:
            logger.info(f"Loading {self.year} {self.grand_prix} {self.session_type}...")
            self.session = fastf1.get_session(self.year, self.grand_prix, self.session_type)
            self.session.load()
            logger.info(f"Session loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load session: {e}")
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
