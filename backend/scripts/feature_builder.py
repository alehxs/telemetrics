"""
Build ML features for podium prediction from Supabase telemetry data
"""
import json
import logging
import pandas as pd
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)

STREET_CIRCUITS = {
    'Monaco', 'Azerbaijan', 'Singapore', 'Miami', 'Las Vegas', 'Saudi Arabia'
}


class FeatureBuilder:
    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    def _fetch_all_session_results(self) -> pd.DataFrame:
        rows = []
        page = 0
        page_size = 1000
        while True:
            resp = (
                self.client.table('telemetry_data')
                .select('year,grand_prix,session,payload')
                .in_('data_type', ['session_results'])
                .in_('session', ['Race', 'Sprint', 'Qualifying', 'Sprint Qualifying'])
                .range(page * page_size, (page + 1) * page_size - 1)
                .execute()
            )
            if not resp.data:
                break
            rows.extend(resp.data)
            if len(resp.data) < page_size:
                break
            page += 1

        records = []
        for row in rows:
            payload = row['payload']
            if isinstance(payload, str):
                payload = json.loads(payload)
            for driver in payload:
                records.append({
                    'year': row['year'],
                    'grand_prix': row['grand_prix'],
                    'session': row['session'],
                    **driver,
                })
        return pd.DataFrame(records)

    def _fetch_sprint_qualifying_gps(self) -> set:
        resp = (
            self.client.table('telemetry_data')
            .select('year,grand_prix')
            .eq('session', 'Sprint Qualifying')
            .execute()
        )
        return {(r['year'], r['grand_prix']) for r in resp.data}

    def build_training_data(self) -> pd.DataFrame:
        logger.info("Fetching session results from Supabase...")
        df = self._fetch_all_session_results()
        sprint_weekends = self._fetch_sprint_qualifying_gps()

        race_df = df[df['session'].isin(['Race', 'Sprint'])].copy()
        quali_df = df[df['session'].isin(['Qualifying', 'Sprint Qualifying'])].copy()

        if race_df.empty:
            raise ValueError("No race/sprint data found in Supabase")

        race_df['Position'] = pd.to_numeric(race_df.get('Position', pd.Series(dtype=float)), errors='coerce')
        race_df = race_df.dropna(subset=['Position', 'Abbreviation', 'TeamName'])
        race_df['Position'] = race_df['Position'].astype(int)

        quali_df['Position'] = pd.to_numeric(quali_df.get('Position', pd.Series(dtype=float)), errors='coerce')
        quali_df = quali_df.dropna(subset=['Position', 'Abbreviation'])
        quali_df = quali_df[['year', 'grand_prix', 'session', 'Abbreviation', 'Position']].rename(
            columns={'Position': 'quali_position', 'session': 'quali_session'}
        )

        quali_map_session = {
            'Race': 'Qualifying',
            'Sprint': 'Sprint Qualifying',
        }
        race_df['quali_session'] = race_df['session'].map(quali_map_session)
        merged = race_df.merge(
            quali_df,
            on=['year', 'grand_prix', 'Abbreviation'],
            how='left',
            suffixes=('', '_dup')
        )
        merged = merged[merged['quali_session'] == merged['quali_session_dup']].copy()
        merged = merged.drop(columns=['quali_session_dup'], errors='ignore')

        merged['is_sprint_weekend'] = merged.apply(
            lambda r: int((r['year'], r['grand_prix']) in sprint_weekends), axis=1
        )
        merged['is_street_circuit'] = merged['grand_prix'].apply(
            lambda gp: int(any(sc.lower() in gp.lower() for sc in STREET_CIRCUITS))
        )
        merged['is_podium'] = (merged['Position'] <= 3).astype(int)

        merged = merged.sort_values(['Abbreviation', 'year', 'grand_prix']).reset_index(drop=True)
        merged = self._add_driver_rolling_features(merged)
        merged = self._add_constructor_rolling_features(merged)
        merged = self._add_track_history_features(merged)
        merged = self._add_season_features(merged)

        return merged

    def _add_driver_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.sort_values(['Abbreviation', 'year', 'grand_prix'])
        grp = df.groupby('Abbreviation')
        df['driver_form_avg_pos_5'] = (
            grp['Position']
            .transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        )
        df['driver_form_podium_rate_5'] = (
            grp['Position']
            .transform(lambda s: (s.shift(1) <= 3).rolling(5, min_periods=1).mean())
        )
        df['dnf_rate_season'] = (
            grp['Position']
            .transform(lambda s: (s.shift(1) > 20).rolling(20, min_periods=1).mean())
        )
        return df

    def _add_constructor_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.sort_values(['TeamName', 'year', 'grand_prix'])
        grp = df.groupby('TeamName')
        df['constructor_form_avg_pos_5'] = (
            grp['Position']
            .transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())
        )
        df['constructor_podium_rate_5'] = (
            grp['Position']
            .transform(lambda s: (s.shift(1) <= 3).rolling(5, min_periods=1).mean())
        )
        return df

    def _add_track_history_features(self, df: pd.DataFrame) -> pd.DataFrame:
        records = []
        for (abbr, gp), group in df.groupby(['Abbreviation', 'grand_prix']):
            group = group.sort_values('year')
            prior_avg = group['Position'].expanding().mean().shift(1)
            prior_podium = (group['Position'] <= 3).expanding().mean().shift(1)
            for i, (idx, row) in enumerate(group.iterrows()):
                records.append({
                    'idx': idx,
                    'track_avg_pos': prior_avg.iloc[i],
                    'track_podium_rate': prior_podium.iloc[i],
                })
        track_df = pd.DataFrame(records).set_index('idx')
        df = df.join(track_df)
        return df

    def _add_season_features(self, df: pd.DataFrame) -> pd.DataFrame:
        season_pts = df.groupby(['year', 'Abbreviation', 'grand_prix']).first()['Position']

        def season_rank(row):
            prior = df[
                (df['year'] == row['year']) &
                (df['Abbreviation'] != row['Abbreviation']) |
                (df['grand_prix'] < row['grand_prix'])
            ]
            pts_before = df[
                (df['year'] == row['year']) &
                (df['grand_prix'] < row['grand_prix'])
            ].groupby('Abbreviation')['Position'].apply(
                lambda s: (21 - s.clip(upper=20)).sum()
            )
            if pts_before.empty:
                return float('nan')
            driver_pts = pts_before.get(row['Abbreviation'], 0)
            return int((pts_before > driver_pts).sum()) + 1

        df['season_points_rank'] = df.apply(season_rank, axis=1)
        return df

    def build_prediction_features(
        self,
        year: int,
        gp: str,
        quali_results: list,
        is_sprint: bool = False,
    ) -> pd.DataFrame:
        logger.info(f"Building prediction features for {year} {gp}...")
        df_hist = self._fetch_all_session_results()
        sprint_weekends = self._fetch_sprint_qualifying_gps()

        race_session = 'Sprint' if is_sprint else 'Race'
        race_df = df_hist[df_hist['session'].isin(['Race', 'Sprint'])].copy()
        race_df['Position'] = pd.to_numeric(race_df.get('Position', pd.Series(dtype=float)), errors='coerce')
        race_df = race_df.dropna(subset=['Position', 'Abbreviation', 'TeamName'])
        race_df['Position'] = race_df['Position'].astype(int)
        hist = race_df[~((race_df['year'] == year) & (race_df['grand_prix'] == gp))].copy()

        rows = []
        for driver in quali_results:
            abbr = driver.get('Abbreviation', 'UNK')
            team = driver.get('TeamName', 'Unknown')
            quali_pos = driver.get('Position', 99)

            driver_hist = hist[hist['Abbreviation'] == abbr].sort_values(['year', 'grand_prix'])
            recent_5 = driver_hist.tail(5)['Position']
            driver_avg = recent_5.mean() if len(recent_5) > 0 else float('nan')
            driver_podium = (recent_5 <= 3).mean() if len(recent_5) > 0 else float('nan')
            dnf_recent = (driver_hist.tail(20)['Position'] > 20).mean() if len(driver_hist) > 0 else float('nan')

            team_hist = hist[hist['TeamName'] == team].sort_values(['year', 'grand_prix'])
            team_recent_5 = team_hist.tail(5)['Position']
            team_avg = team_recent_5.mean() if len(team_recent_5) > 0 else float('nan')
            team_podium = (team_recent_5 <= 3).mean() if len(team_recent_5) > 0 else float('nan')

            track_hist = hist[(hist['Abbreviation'] == abbr) & (hist['grand_prix'] == gp)]
            track_avg = track_hist['Position'].mean() if len(track_hist) > 0 else float('nan')
            track_pod = (track_hist['Position'] <= 3).mean() if len(track_hist) > 0 else float('nan')

            pts_before = hist[hist['year'] == year].groupby('Abbreviation')['Position'].apply(
                lambda s: (21 - s.clip(upper=20)).sum()
            )
            driver_pts = pts_before.get(abbr, 0)
            season_rank = int((pts_before > driver_pts).sum()) + 1 if not pts_before.empty else float('nan')

            rows.append({
                'Abbreviation': abbr,
                'TeamName': team,
                'quali_position': quali_pos,
                'is_sprint_weekend': int((year, gp) in sprint_weekends),
                'driver_form_avg_pos_5': driver_avg,
                'driver_form_podium_rate_5': driver_podium,
                'track_avg_pos': track_avg,
                'track_podium_rate': track_pod,
                'constructor_form_avg_pos_5': team_avg,
                'constructor_podium_rate_5': team_podium,
                'dnf_rate_season': dnf_recent,
                'season_points_rank': season_rank,
                'is_street_circuit': int(any(sc.lower() in gp.lower() for sc in STREET_CIRCUITS)),
            })

        return pd.DataFrame(rows)
