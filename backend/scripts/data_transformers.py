"""
Transform FastF1 data into frontend-compatible JSON structures
"""
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any, Optional
from config import TEAM_MAPPINGS, DRIVER_HEADSHOT_URL, TEAM_LOGO_PATH

logger = logging.getLogger(__name__)


class DataTransformer:
    """Transform FastF1 data to frontend format"""

    def __init__(self, extractor):
        self.extractor = extractor

    def _normalize_team_name(self, team: str) -> str:
        """Normalize team names to match frontend assets"""
        return TEAM_MAPPINGS.get(team, team)

    def _get_team_logo_path(self, team: str) -> str:
        """Get team logo path"""
        normalized = self._normalize_team_name(team)
        filename = normalized.lower().replace(' ', '_')
        return TEAM_LOGO_PATH.format(team=filename)

    def _get_driver_headshot_url(self, driver_abbr: str) -> str:
        """Get driver headshot URL"""
        return DRIVER_HEADSHOT_URL.format(
            year=self.extractor.year,
            driver=driver_abbr.upper()
        )

    def _format_timedelta(self, td) -> str:
        """Format pandas Timedelta to string"""
        if pd.isna(td):
            return "DNF"
        return str(td)

    def _get_compound_name(self, compound) -> str:
        """Get tyre compound name"""
        if pd.isna(compound):
            return "UNKNOWN"
        compound_map = {
            'SOFT': 'SOFT',
            'MEDIUM': 'MEDIUM',
            'HARD': 'HARD',
            'INTERMEDIATE': 'INTERMEDIATE',
            'WET': 'WET'
        }
        return compound_map.get(str(compound).upper(), 'UNKNOWN')

    def transform_session_results(self) -> List[Dict[str, Any]]:
        """
        Transform session results (race/qualifying standings)
        """
        results = self.extractor.get_driver_standings()

        session_results = []
        for _, row in results.iterrows():
            team_name = self._normalize_team_name(row.get('TeamName', 'Unknown'))

            entry = {
                'Position': int(row['Position']) if pd.notna(row['Position']) else 999,
                'Abbreviation': str(row.get('Abbreviation', 'UNK')),
                'TeamName': team_name,
                'TeamLogo': self._get_team_logo_path(team_name),
                'TeamColor': f"#{row.get('TeamColor', 'CCCCCC')}",
                'Status': str(row.get('Status', 'Unknown')),
                'Time': self._format_timedelta(row.get('Time', pd.NaT)),
                'DriverNumber': str(row.get('DriverNumber', '')),
                'Points': int(row.get('Points', 0)) if pd.notna(row.get('Points')) else 0
            }
            session_results.append(entry)

        return sorted(session_results, key=lambda x: x['Position'])

    def transform_podium(self) -> List[Dict[str, Any]]:
        """
        Transform podium finishers (top 3)
        """
        results = self.extractor.get_driver_standings()
        top_3 = results.head(3)

        podium = []
        for _, row in top_3.iterrows():
            # Skip rows with invalid Position data
            if pd.isna(row.get('Position')):
                continue

            team_name = self._normalize_team_name(row.get('TeamName', 'Unknown'))
            abbr = str(row.get('Abbreviation', 'UNK'))

            entry = {
                'Position': int(row['Position']),
                'Abbreviation': abbr,
                'TeamName': team_name,
                'TeamColor': f"#{row.get('TeamColor', 'CCCCCC')}",
                'TeamLogo': self._get_team_logo_path(team_name),
                'HeadshotUrl': self._get_driver_headshot_url(abbr),
                'Status': str(row.get('Status', 'Finished')),
                'Time': self._format_timedelta(row.get('Time', pd.NaT))
            }
            podium.append(entry)

        return podium

    def transform_fastest_lap(self) -> Optional[Dict[str, Any]]:
        """
        Transform fastest lap info
        """
        fastest = self.extractor.get_fastest_lap()
        if fastest is None:
            return None

        return {
            'Driver': str(fastest.get('Driver', 'UNK')),
            'LapTime': self._format_timedelta(fastest.get('LapTime', pd.NaT)),
            'LapNumber': int(fastest.get('LapNumber', 0)),
            'TyreAge': int(fastest.get('TyreLife', 0)) if pd.notna(fastest.get('TyreLife')) else 0,
            'TyreCompound': self._get_compound_name(fastest.get('Compound'))
        }

    def transform_session_info(self) -> Dict[str, Any]:
        """
        Transform session metadata
        """
        event_info = self.extractor.get_event_info()

        # Get total laps from session
        total_laps = 0
        try:
            laps = self.extractor.get_laps()
            if not laps.empty:
                total_laps = int(laps['LapNumber'].max())
        except:
            pass

        return {
            'Country': event_info.get('Country', 'Unknown'),
            'Location': event_info.get('Location', 'Unknown'),
            'EventName': event_info.get('EventName', 'Unknown'),
            'EventDate': event_info.get('EventDate', 'Unknown'),
            'OfficialEventName': event_info.get('OfficialEventName', 'Unknown'),
            'TotalLaps': total_laps
        }

    def transform_track_dominance(self) -> Dict[str, Any]:
        """
        Transform track dominance (fastest per segment) - TOP 2 FINISHERS ONLY
        Shows which driver was fastest at each point on the track using telemetry data
        """
        results = self.extractor.get_driver_standings()

        # Get TOP 2 finishers only
        top_2 = results.head(2)

        if len(top_2) < 2:
            # Not enough drivers for comparison
            logger.warning("Not enough drivers for track dominance comparison")
            return {
                'drivers': [],
                'teamColors': [],
                'segments': []
            }

        # Extract driver info
        driver1_abbr = str(top_2.iloc[0].get('Abbreviation', 'UNK'))
        driver2_abbr = str(top_2.iloc[1].get('Abbreviation', 'UNK'))
        driver1_num = str(top_2.iloc[0].get('DriverNumber', ''))
        driver2_num = str(top_2.iloc[1].get('DriverNumber', ''))
        driver1_color = top_2.iloc[0].get('TeamColor', 'CCCCCC')
        driver2_color = top_2.iloc[1].get('TeamColor', 'CCCCCC')

        try:
            # Get all laps
            laps = self.extractor.get_laps()

            # Get fastest laps for both drivers
            laps1 = laps[laps['DriverNumber'] == driver1_num]
            laps2 = laps[laps['DriverNumber'] == driver2_num]

            if laps1.empty or laps2.empty:
                logger.warning("No laps found for one or both drivers")
                return {
                    'drivers': [driver1_abbr, driver2_abbr],
                    'teamColors': [driver1_color, driver2_color],
                    'segments': []
                }

            # Pick fastest laps
            lap1 = laps1.pick_fastest()
            lap2 = laps2.pick_fastest()

            # Get telemetry with distance
            tel1 = lap1.get_telemetry().add_distance()
            tel2 = lap2.get_telemetry().add_distance()

            # Add driver identifiers
            tel1['Driver'] = driver1_abbr
            tel2['Driver'] = driver2_abbr

            # Merge telemetry
            telemetry = pd.concat([tel1, tel2])

            # Define minisectors (25 segments is standard)
            num_minisectors = 25
            total_distance = telemetry['Distance'].max()
            minisector_length = total_distance / num_minisectors

            # Assign minisector to each point
            telemetry['Minisector'] = (telemetry['Distance'] // minisector_length).astype(int)

            # Calculate average speed per driver per minisector
            avg_speed = telemetry.groupby(['Minisector', 'Driver'])['Speed'].mean().reset_index()

            # Find fastest driver in each minisector
            fastest_driver = avg_speed.loc[avg_speed.groupby('Minisector')['Speed'].idxmax()]

            # Build segments with X/Y coordinates
            segments = []
            current_driver = None
            current_points = []

            for minisector in sorted(fastest_driver['Minisector'].unique()):
                fastest = fastest_driver[fastest_driver['Minisector'] == minisector]['Driver'].values[0]

                # Get telemetry points for this minisector
                minisector_tel = telemetry[
                    (telemetry['Minisector'] == minisector) &
                    (telemetry['Driver'] == fastest)
                ].sort_values('Distance')

                # Extract X/Y coordinates
                points = [[float(row['X']), float(row['Y'])] for _, row in minisector_tel.iterrows()]

                # Group consecutive minisectors with same driver
                if fastest == current_driver:
                    current_points.extend(points)
                else:
                    if current_driver is not None and current_points:
                        segments.append({
                            'fastestDriver': current_driver,
                            'points': current_points
                        })
                    current_driver = fastest
                    current_points = points

            # Add final segment
            if current_driver is not None and current_points:
                segments.append({
                    'fastestDriver': current_driver,
                    'points': current_points
                })

            logger.info(f"Created track dominance with {len(segments)} segments")

            return {
                'drivers': [driver1_abbr, driver2_abbr],
                'teamColors': [driver1_color, driver2_color],
                'segments': segments
            }

        except Exception as e:
            logger.error(f"Failed to create track dominance visualization: {e}")
            return {
                'drivers': [driver1_abbr, driver2_abbr],
                'teamColors': [driver1_color, driver2_color],
                'segments': []
            }

    def transform_tyres(self) -> List[Dict[str, Any]]:
        """
        Transform tyre strategy (compound per lap per driver)
        """
        laps = self.extractor.get_laps()

        tyre_data = []
        for _, lap in laps.iterrows():
            entry = {
                'Driver': str(lap.get('Driver', 'UNK')),
                'Abbreviation': str(lap.get('Driver', 'UNK')),
                'LapNumber': int(lap.get('LapNumber', 0)),
                'Compound': self._get_compound_name(lap.get('Compound'))
            }
            tyre_data.append(entry)

        return tyre_data

    def transform_lap_chart_data(self) -> Dict[str, Any]:
        """
        Transform lap times for all drivers
        """
        laps = self.extractor.get_laps()
        results = self.extractor.get_driver_standings()

        # Get podium drivers
        top_3 = results.head(3)
        podium = [str(row.get('Abbreviation', 'UNK')) for _, row in top_3.iterrows()]

        # Build lap data
        lap_entries = []
        for _, lap in laps.iterrows():
            if pd.notna(lap.get('LapTime')):
                # Format lap time as M:SS.mmm
                lap_time = lap.get('LapTime')
                if isinstance(lap_time, pd.Timedelta):
                    total_seconds = lap_time.total_seconds()
                    minutes = int(total_seconds // 60)
                    seconds = total_seconds % 60
                    formatted_time = f"{minutes}:{seconds:06.3f}"
                else:
                    formatted_time = str(lap_time)

                entry = {
                    'driver': str(lap.get('Driver', 'UNK')),
                    'lapNumber': int(lap.get('LapNumber', 0)),
                    'lapTime': formatted_time
                }
                lap_entries.append(entry)

        return {
            'podium': podium,
            'laps': lap_entries
        }
