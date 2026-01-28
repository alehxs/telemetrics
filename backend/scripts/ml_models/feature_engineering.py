"""
Feature Engineering for F1 Race Predictions

This module extracts ML-ready features from raw F1 historical data.
Feature engineering is the process of transforming raw data into meaningful
input features that machine learning models can learn from.

TODO(human): Implement feature extraction pipeline
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging

from ml_models.ml_config import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    CONTEXT_COLUMNS,
    EXCLUDE_DNF_FROM_TRAINING,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Extracts machine learning features from historical F1 data.

    The goal is to transform raw race data (qualifying times, lap times, etc.)
    into numerical features that can predict race finishing times.

    Key Challenge: Only use features that are AVAILABLE BEFORE THE RACE STARTS!
    (e.g., qualifying time is known, but race sector times are not)
    """

    def __init__(self, historical_data: Dict[str, pd.DataFrame]):
        """
        Initialize with historical race data.

        Args:
            historical_data: Dictionary containing:
                - 'race_results': DataFrame with race finishing data
                - 'qualifying': DataFrame with qualifying results
                - 'merged': DataFrame with both race and qualifying data
        """
        self.historical_data = historical_data
        self.race_results = historical_data.get('race_results', pd.DataFrame())
        self.qualifying = historical_data.get('qualifying', pd.DataFrame())
        self.merged = historical_data.get('merged', pd.DataFrame())

        logger.info(f"FeatureEngineer initialized with {len(self.merged)} historical records")

    def extract_features(
        self,
        year: int,
        grand_prix: str,
        for_training: bool = True
    ) -> pd.DataFrame:
        """
        Extract ML-ready features for a specific race.

        TODO(human): Implement this method to extract features from historical data.

        This is the CORE of your ML pipeline. Your task is to:
        1. Filter the historical data for the specified race
        2. Extract features that predict race finishing time
        3. Return a DataFrame ready for model training/prediction

        Args:
            year: Year of the race
            grand_prix: Grand Prix name (e.g., "Bahrain Grand Prix")
            for_training: If True, include target variable (race_time_seconds)
                         If False, only include features (for prediction)

        Returns:
            DataFrame with columns:
                - driver_abbr: Driver abbreviation (context, not a feature)
                - driver_name: Driver full name (context, not a feature)
                - team: Team name (context, not a feature)
                - qualifying_time: Qualifying lap time in seconds (FEATURE)
                - [optional] avg_sector_time: Average sector time (FEATURE)
                - [optional] track_history_avg: Driver's avg position at this track (FEATURE)
                - [optional] team_season_avg: Team's avg position this season (FEATURE)
                - race_time_seconds: Total race time in seconds (TARGET - only if for_training=True)

        Implementation Guidance:
        ────────────────────────────────────────────────────────────────────
        1. START SIMPLE:
           - Begin with only qualifying_time as your feature
           - This matches the mar-antaya approach (prediction1.py)
           - Get this working before adding complexity

        2. FEATURE IDEAS (add incrementally):
           Qualifying-based:
             - qualifying_position: Grid position from qualifying
             - gap_to_pole: Time difference to pole position

           Historical performance:
             - track_history_avg: Driver's average finish position at this circuit
             - last_5_races_avg: Driver's average position in last 5 races
             - driver_season_avg: Driver's average position this season

           Team-based:
             - team_season_avg: Team's average position this season
             - team_track_avg: Team's average position at this circuit

        3. DATA FILTERING:
           - For training: Filter merged data for races BEFORE the target race
             (temporal split - don't leak future data!)
           - For prediction: Use only data available before race start

        4. HANDLE MISSING DATA:
           - New drivers: No historical track data → use team average or NaN
           - Missing qualifying: Driver didn't qualify → exclude or use default
           - DNFs: Already excluded by data_loader if EXCLUDE_DNF_FROM_TRAINING=True

        5. TARGET VARIABLE:
           - race_time_seconds: Total race time in seconds
           - Lower time = better (winner has lowest time)
           - Exclude if for_training=False (prediction mode)

        Example Implementation Structure:
        ─────────────────────────────────────────────────────────────────────
        ```python
        # Step 1: Filter data for this race
        race_data = self.merged[
            (self.merged['year'] == year) &
            (self.merged['grand_prix'] == grand_prix)
        ].copy()

        if race_data.empty:
            logger.warning(f"No data found for {year} {grand_prix}")
            return pd.DataFrame()

        # Step 2: Extract basic features
        features_df = race_data[CONTEXT_COLUMNS + ['qualifying_time']].copy()

        # Step 3: Add target variable if training
        if for_training:
            features_df['race_time_seconds'] = race_data['race_time_seconds']
            # Remove rows with missing target
            features_df = features_df.dropna(subset=['race_time_seconds'])

        # Step 4: (Optional) Add more features here
        # features_df['gap_to_pole'] = ...
        # features_df['track_history_avg'] = ...

        return features_df
        ```

        Testing Your Implementation:
        ─────────────────────────────────────────────────────────────────────
        Test with:
            python -c "from ml_models.data_loader import F1DataLoader; \\
                       from ml_models.feature_engineering import FeatureEngineer; \\
                       loader = F1DataLoader(); \\
                       data = loader.load_historical_races(2023, 2024); \\
                       fe = FeatureEngineer(data); \\
                       features = fe.extract_features(2024, 'Bahrain Grand Prix'); \\
                       print(features.head())"
        """
        # TODO(human): Implement feature extraction logic here
        raise NotImplementedError(
            "Feature extraction not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def extract_all_training_features(self) -> pd.DataFrame:
        """
        Extract features for ALL races in the historical dataset.

        This is used for model training - it creates the complete training dataset
        by extracting features for every race in the historical data.

        TODO(human): Implement this method to extract features for all historical races.

        Returns:
            DataFrame with features and target for all historical races

        Implementation Guidance:
        ────────────────────────────────────────────────────────────────────
        Iterate through all unique (year, grand_prix) combinations in the
        merged dataset and call extract_features() for each race.

        Example:
        ```python
        all_features = []

        for (year, gp) in self.merged[['year', 'grand_prix']].drop_duplicates().values:
            race_features = self.extract_features(year, gp, for_training=True)
            if not race_features.empty:
                all_features.append(race_features)

        return pd.concat(all_features, ignore_index=True)
        ```
        """
        # TODO(human): Implement extraction for all races
        raise NotImplementedError(
            "All-races feature extraction not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def calculate_historical_stats(
        self,
        driver_abbr: str,
        grand_prix: str,
        before_year: int
    ) -> Dict[str, float]:
        """
        Calculate historical statistics for a driver at a specific track.

        TODO(human): (OPTIONAL - Advanced Feature) Implement historical stats calculation.

        This is an OPTIONAL advanced feature. Only implement this after you have
        the basic model working with qualifying_time alone.

        Args:
            driver_abbr: Driver abbreviation (e.g., "VER")
            grand_prix: Grand Prix name
            before_year: Only use data before this year (avoid data leakage)

        Returns:
            Dictionary with stats like:
                - track_history_avg: Average position at this track
                - track_history_count: Number of races at this track
                - last_5_avg: Average position in last 5 races

        Example:
        ```python
        driver_history = self.race_results[
            (self.race_results['driver_abbr'] == driver_abbr) &
            (self.race_results['grand_prix'] == grand_prix) &
            (self.race_results['year'] < before_year)
        ]

        return {
            'track_history_avg': driver_history['position'].mean(),
            'track_history_count': len(driver_history),
        }
        ```
        """
        # TODO(human): (OPTIONAL) Implement historical stats
        return {}


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Feature Engineering Test")
    print("=" * 70 + "\n")

    print("⚠️  Feature extraction not yet implemented (TODO(human))")
    print("\nTo test after implementation, uncomment the code below:\n")

    # Uncomment after implementing extract_features()
    # from ml_models.data_loader import F1DataLoader
    #
    # loader = F1DataLoader()
    # data = loader.load_historical_races(2023, 2024)
    #
    # fe = FeatureEngineer(data)
    #
    # print("Test 1: Extract features for Bahrain 2024...")
    # features = fe.extract_features(2024, 'Bahrain Grand Prix', for_training=True)
    # print(f"  → Extracted {len(features)} driver records")
    # print(f"  → Columns: {', '.join(features.columns)}")
    # print(f"  → Sample:\n{features.head()}\n")
    #
    # print("Test 2: Extract all training features...")
    # all_features = fe.extract_all_training_features()
    # print(f"  → Total training samples: {len(all_features)}")
    # print(f"  → Feature columns: {', '.join([c for c in all_features.columns if c in FEATURE_COLUMNS])}")

    print("=" * 70)
