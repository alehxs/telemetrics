"""
Transform FastF1 data into frontend-compatible JSON structures

CRITICAL DATA AVAILABILITY NOTES:
- Full telemetry/weather/position data: 2018+ ONLY
- Pre-2018: Limited session results only (via Ergast API)
- Data available 30-120 minutes post-session

YEAR-SPECIFIC DIFFERENCES (2018-2025):
1. Sprint Qualifying Format:
   - 2021-2022: Race format (no Q1/Q2/Q3 times)
   - 2024+: Qualifying format (has Q1/Q2/Q3 times)

2. Tyre Compounds:
   - API only shows SOFT/MEDIUM/HARD (NOT C-numbers)
   - Physical compound varies by race (C1-C5, sometimes C0 or C6)
   - C-number mapping requires external Pirelli data

3. Known Issues:
   - 2022: Server infrastructure issues (mostly resolved)
   - Individual races may have quirks (e.g., 2024 Sao Paulo GP)
   - Ergast API deprecated (end of 2024) - using Jolpica-F1

DATA QUALITY PHILOSOPHY:
- Minimal ML/prediction usage
- Only generates data with "mostly absolute certainty"
- Missing sector times calculated mathematically
- Rare case: Full laps generated only for first-lap crashes
"""
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any, Optional
from config import TEAM_MAPPINGS, DRIVER_HEADSHOT_URL, TEAM_LOGO_PATH, QUALIFYING_SESSION_TYPES, PRACTICE_SESSION_TYPES

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
        return DRIVER_HEADSHOT_URL.format(driver=driver_abbr.upper())

    def _format_timedelta(self, td) -> str:
        """Format pandas Timedelta to string"""
        if pd.isna(td):
            return "DNF"
        return str(td)

    def _format_gap_time(self, td) -> str:
        """Format time gap as seconds with + prefix (e.g., '+4.705')
        Format: +S.mmm where mmm is milliseconds (3 digits)
        """
        if pd.isna(td):
            return "DNF"
        # Convert to seconds and format with 3 decimal places
        total_seconds = td.total_seconds()
        return f"+{total_seconds:.3f}"

    def _format_lap_time(self, td) -> str:
        """Format lap/race time as MM:SS.mmm or H:MM:SS.mmm
        Format: MM:SS.mmm where MM=minutes, SS=seconds, mmm=milliseconds (3 digits)
        For times over 1 hour: H:MM:SS.mmm
        Examples: 01:18.336 or 1:32:18.336
        """
        if pd.isna(td):
            return "DNF"

        total_seconds = td.total_seconds()
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = total_seconds % 60

        # If over 1 hour, include hours
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:06.3f}"
        else:
            # Format as MM:SS.mmm (2 digit minutes, 2 digit seconds, 3 digit milliseconds)
            return f"{minutes:02d}:{seconds:06.3f}"

    def _get_compound_name(self, compound) -> str:
        """Get tyre compound name

        IMPORTANT LIMITATIONS:
        - FastF1 API only provides SOFT/MEDIUM/HARD labels (NOT C-numbers like C1-C5)
        - The same physical compound (e.g., C3) can be labeled differently at different tracks
        - Pirelli selects 3 compounds per race and labels them as Soft/Medium/Hard
        - To get C-number mappings, you need external Pirelli pre-race announcements

        Historical Context:
        - 2018: Old names (Ultrasoft, Supersoft, etc.) → simplified to SOFT/MEDIUM/HARD
        - 2019-2022: C1-C5 system (C1=hardest, C5=softest)
        - 2023: Extended to C0-C5 (C0 never used)
        - 2024: Back to C1-C5
        - 2025: Extended to C1-C6 (C6=ultra-soft)
        - 2026: Back to C1-C5

        Args:
            compound: Compound code from FastF1 API

        Returns:
            Normalized compound name (SOFT/MEDIUM/HARD/INTERMEDIATE/WET/UNKNOWN)
        """
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

    def _normalize_status(self, row, leader_laps: int, driver_laps: int) -> str:
        """Normalize status based on classification and lap count

        Args:
            row: DataFrame row with driver data
            leader_laps: Maximum lap count (leader's lap count)
            driver_laps: Lap count for this driver

        Returns:
            Normalized status string
        """
        classified_pos = str(row.get('ClassifiedPosition', ''))
        status = str(row.get('Status', 'Unknown'))

        # Handle disqualifications and exclusions
        if classified_pos in ['D', 'E']:
            return 'DSQ'

        # Handle withdrawn
        if classified_pos == 'W':
            return 'DNF'

        # Handle not classified (treat as DNF)
        if classified_pos == 'N':
            return 'DNF'

        # Handle retirements - show specific reason if available
        if classified_pos == 'R':
            # Keep specific reason if available (e.g., "Accident", "Engine", "Gearbox")
            # Otherwise default to "DNF"
            if status and status not in ['Finished', 'Unknown', '']:
                return status
            return 'DNF'

        # Handle classified finishers
        if driver_laps > 0 and leader_laps > 0:
            lap_deficit = int(leader_laps - driver_laps)
            if lap_deficit > 0:
                return f"+{lap_deficit} Lap" if lap_deficit == 1 else f"+{lap_deficit} Laps"

        # Default to Finished
        return 'Finished'

    def _get_best_qualifying_time(self, row) -> str:
        """Return the driver's best time from their highest qualifying segment (Q3→Q2→Q1)."""
        for col in ['Q3', 'Q2', 'Q1']:
            val = row.get(col)
            if val is not None and not pd.isna(val):
                return self._format_lap_time(val)
        return "DNF"

    def transform_session_results(self) -> List[Dict[str, Any]]:
        """
        Transform session results (race/qualifying standings)
        """
        is_qualifying = self.extractor.session_type in QUALIFYING_SESSION_TYPES
        is_practice = self.extractor.session_type in PRACTICE_SESSION_TYPES

        results = self.extractor.get_driver_standings()

        lap_counts = {}
        leader_laps = 0
        if not is_qualifying and not is_practice:
            try:
                laps = self.extractor.get_laps()
                if not laps.empty:
                    lap_counts = laps.groupby('Driver')['LapNumber'].max().to_dict()
                    leader_laps = max(lap_counts.values()) if lap_counts else 0
            except Exception as e:
                logger.warning(f"Could not calculate lap counts: {e}")

        p1_time = pd.NaT
        if is_practice:
            first_valid = results[results['Time'].notna()]
            if not first_valid.empty:
                p1_time = first_valid.iloc[0]['Time']

        session_results = []
        for _, row in results.iterrows():
            team_name = self._normalize_team_name(row.get('TeamName', 'Unknown'))
            driver_abbr = str(row.get('Abbreviation', 'UNK'))

            if is_qualifying:
                best_time = self._get_best_qualifying_time(row)
                if best_time != 'DNF':
                    status = 'Finished'
                elif str(row.get('ClassifiedPosition', '')).upper() in ['R', 'W', 'N', 'D', 'E']:
                    status = 'DNF'
                else:
                    status = 'DNS'
            elif is_practice:
                time_val = row.get('Time', pd.NaT)
                if pd.notna(time_val):
                    is_p1 = pd.notna(p1_time) and time_val == p1_time
                    gap = time_val - p1_time if (not is_p1 and pd.notna(p1_time)) else time_val
                    best_time = self._format_timedelta(gap)
                    status = 'Finished'
                else:
                    best_time = 'DNF'
                    status = 'DNF'
            else:
                driver_laps = lap_counts.get(driver_abbr, 0)
                best_time = self._format_timedelta(row.get('Time', pd.NaT))
                status = self._normalize_status(row, leader_laps, driver_laps)

            entry = {
                'Position': int(row['Position']) if pd.notna(row['Position']) else 999,
                'Abbreviation': driver_abbr,
                'TeamName': team_name,
                'TeamLogo': self._get_team_logo_path(team_name),
                'TeamColor': f"#{row.get('TeamColor', 'CCCCCC')}",
                'Status': status,
                'Time': best_time,
                'DriverNumber': str(row.get('DriverNumber', '')),
                'Points': int(row.get('Points', 0)) if pd.notna(row.get('Points')) else 0
            }
            session_results.append(entry)

        sorted_results = sorted(session_results, key=lambda x: x['Position'])
        next_pos = next((r['Position'] for r in reversed(sorted_results) if r['Position'] < 999), 0) + 1
        for entry in sorted_results:
            if entry['Position'] >= 999:
                entry['Position'] = next_pos
                next_pos += 1
        return sorted_results

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
            position = int(row['Position'])

            # Format time based on position:
            # - P1: Total race time (not shown in frontend, replaced with "Leader")
            # - P2/P3: Gap to leader (formatted as +X.XXX seconds)
            # - DNF: "DNF"
            time_value = row.get('Time', pd.NaT)
            if position == 1:
                formatted_time = self._format_timedelta(time_value)
            else:
                formatted_time = self._format_gap_time(time_value)

            entry = {
                'Position': position,
                'Abbreviation': abbr,
                'TeamName': team_name,
                'TeamColor': f"#{row.get('TeamColor', 'CCCCCC')}",
                'TeamLogo': self._get_team_logo_path(team_name),
                'HeadshotUrl': self._get_driver_headshot_url(abbr),
                'Status': str(row.get('Status', 'Finished')),
                'Time': formatted_time
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
            'LapTime': self._format_lap_time(fastest.get('LapTime', pd.NaT)),
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

            # Define minisectors (50 segments for ~100m resolution)
            num_minisectors = 50
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

            # Close segment boundary gaps
            for i in range(len(segments) - 1):
                if not segments[i + 1]['points']:
                    continue
                next_first = segments[i + 1]['points'][0]
                segments[i]['points'].append(next_first)

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

        return [
            {
                'Driver': str(lap.get('Driver', 'UNK')),
                'Abbreviation': str(lap.get('Driver', 'UNK')),
                'LapNumber': int(lap.get('LapNumber', 0)),
                'Compound': self._get_compound_name(lap.get('Compound'))
            }
            for lap in laps[['Driver', 'LapNumber', 'Compound']].to_dict('records')
        ]

    def transform_lap_chart_data(self) -> Dict[str, Any]:
        """
        Transform lap times for all drivers
        """
        laps = self.extractor.get_laps()
        results = self.extractor.get_driver_standings()

        podium = [str(row.get('Abbreviation', 'UNK')) for row in results.head(3).to_dict('records')]

        lap_entries = []
        for lap in laps[['Driver', 'LapNumber', 'LapTime']].to_dict('records'):
            lap_time = lap.get('LapTime')
            if pd.notna(lap_time):
                if isinstance(lap_time, pd.Timedelta):
                    total_seconds = lap_time.total_seconds()
                    minutes = int(total_seconds // 60)
                    seconds = total_seconds % 60
                    formatted_time = f"{minutes}:{seconds:06.3f}"
                else:
                    formatted_time = str(lap_time)

                lap_entries.append({
                    'driver': str(lap.get('Driver', 'UNK')),
                    'lapNumber': int(lap.get('LapNumber', 0)),
                    'lapTime': formatted_time
                })

        return {
            'podium': podium,
            'laps': lap_entries
        }
