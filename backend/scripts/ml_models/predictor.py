"""
Race Prediction Generator

This module generates race predictions by combining a trained ML model with
live qualifying data. It ranks drivers by predicted race time and formats
the output for database storage and frontend display.

TODO(human): Implement prediction generation pipeline
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any
import logging
from pathlib import Path

from ml_models.ml_config import (
    FEATURE_COLUMNS,
    CONTEXT_COLUMNS,
    MODEL_VERSION,
)
from ml_models.model_trainer import RacePredictor
from ml_models.feature_engineering import FeatureEngineer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PredictionGenerator:
    """
    Generates race predictions using a trained ML model.

    The prediction pipeline:
    1. Load qualifying data for the target race
    2. Extract features using FeatureEngineer
    3. Run features through trained model
    4. Rank drivers by predicted race time (fastest = P1)
    5. Format predictions for database storage
    """

    def __init__(
        self,
        model: RacePredictor,
        feature_engineer: FeatureEngineer
    ):
        """
        Initialize prediction generator.

        Args:
            model: Trained RacePredictor model
            feature_engineer: FeatureEngineer instance with historical data
        """
        self.model = model
        self.feature_engineer = feature_engineer

        if model.model is None:
            logger.warning("Model not trained. Load or train a model before predicting.")

    def predict_race(
        self,
        year: int,
        grand_prix: str,
        qualifying_data: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Generate race predictions for a specific Grand Prix.

        TODO(human): Implement race prediction generation.

        This method ties everything together - it's where your trained model
        makes real predictions! Your task is to:
        1. Prepare qualifying data with FeatureEngineer
        2. Extract features for prediction
        3. Run through trained model
        4. Rank drivers by predicted time
        5. Format output

        Args:
            year: Year of the race (e.g., 2025)
            grand_prix: Grand Prix name (e.g., "Bahrain Grand Prix")
            qualifying_data: DataFrame with qualifying results containing:
                - driver_abbr, driver_name, team
                - qualifying_time, qualifying_position

        Returns:
            List of predictions sorted by position (P1 first), each containing:
            {
                'position': 1,
                'driver_abbr': 'VER',
                'driver_name': 'Max Verstappen',
                'team': 'Red Bull Racing',
                'predicted_race_time_seconds': 5234.56,
                'qualifying_time': 78.234,
                'qualifying_position': 1,
                'features': {
                    'qualifying_time': 78.234,
                    # ... other features used
                }
            }

        Implementation Guidance:
        ────────────────────────────────────────────────────────────────────
        1. VALIDATE INPUT:
           ```python
           if qualifying_data.empty:
               logger.error(f"No qualifying data for {year} {grand_prix}")
               return []

           if self.model.model is None:
               logger.error("Model not loaded")
               return []

           logger.info(f"Predicting {year} {grand_prix} with {len(qualifying_data)} drivers")
           ```

        2. EXTRACT FEATURES:
           ```python
           # Use FeatureEngineer to extract features (not for training)
           # This should use the same feature extraction logic you implemented
           # in feature_engineering.py, but with for_training=False

           # For now, manually extract features from qualifying_data:
           features_df = qualifying_data.copy()

           # Ensure required columns exist
           required_cols = CONTEXT_COLUMNS + FEATURE_COLUMNS
           for col in required_cols:
               if col not in features_df.columns:
                   if col in FEATURE_COLUMNS:
                       logger.warning(f"Feature {col} not in qualifying_data, skipping")
                   else:
                       logger.error(f"Context column {col} missing")
                       return []
           ```

        3. GENERATE PREDICTIONS:
           ```python
           # Get predicted race times
           predicted_times = self.model.predict(features_df)

           # Add predictions to dataframe
           features_df['predicted_race_time_seconds'] = predicted_times
           ```

        4. RANK DRIVERS:
           ```python
           # Sort by predicted time (lowest time = fastest = position 1)
           features_df = features_df.sort_values('predicted_race_time_seconds')
           features_df['position'] = range(1, len(features_df) + 1)
           ```

        5. FORMAT OUTPUT:
           ```python
           predictions = []

           for _, row in features_df.iterrows():
               # Build feature dict (only the actual ML features)
               features_dict = {
                   feat: row.get(feat)
                   for feat in FEATURE_COLUMNS
                   if feat in row
               }

               prediction = {
                   'position': int(row['position']),
                   'driver_abbr': row['driver_abbr'],
                   'driver_name': row.get('driver_name', ''),
                   'team': row.get('team', ''),
                   'predicted_race_time_seconds': float(row['predicted_race_time_seconds']),
                   'qualifying_time': float(row.get('qualifying_time', 0)),
                   'qualifying_position': int(row.get('qualifying_position', 0)),
                   'features': features_dict
               }

               predictions.append(prediction)

           logger.info(f"✓ Generated predictions for {len(predictions)} drivers")
           logger.info(f"  Predicted winner: {predictions[0]['driver_abbr']} " +
                      f"({predictions[0]['predicted_race_time_seconds']:.2f}s)")

           return predictions
           ```

        Understanding the Output:
        ────────────────────────────────────────────────────────────────────
        The predictions list represents the PREDICTED finishing order:
        - predictions[0] = Predicted winner (P1)
        - predictions[1] = Predicted P2
        - predictions[2] = Predicted P3
        - ...

        Each prediction includes:
        - position: Predicted finishing position (1 = winner)
        - driver_abbr: Driver code (e.g., "VER")
        - predicted_race_time_seconds: Total race time (lower = faster)
        - qualifying_time: Input feature from qualifying
        - features: All features used by the model

        Edge Cases to Handle:
        ────────────────────────────────────────────────────────────────────
        1. Missing qualifying times:
           - Driver didn't qualify → exclude from predictions
           - Or use team average qualifying time

        2. New drivers not in training data:
           - Model will still predict based on qualifying time
           - May be less accurate due to no historical data

        3. Invalid feature values:
           - Check for NaN/None values before prediction
           - Filter out rows with missing required features

        Testing Your Implementation:
        ─────────────────────────────────────────────────────────────────────
        ```python
        from ml_models.data_loader import F1DataLoader, load_qualifying_for_prediction
        from ml_models.feature_engineering import FeatureEngineer
        from ml_models.model_trainer import RacePredictor
        from ml_models.predictor import PredictionGenerator

        # Load and train model
        loader = F1DataLoader()
        data = loader.load_historical_races(2018, 2024)
        fe = FeatureEngineer(data)
        features = fe.extract_all_training_features()

        predictor = RacePredictor()
        predictor.train(features)

        # Generate predictions
        qualifying = load_qualifying_for_prediction(2024, 'Bahrain Grand Prix')
        pg = PredictionGenerator(predictor, fe)
        predictions = pg.predict_race(2024, 'Bahrain Grand Prix', qualifying)

        # Check output
        print(f"Predicted Top 3:")
        for pred in predictions[:3]:
            print(f"  P{pred['position']}: {pred['driver_abbr']} - {pred['team']}")
        ```
        """
        # TODO(human): Implement prediction generation logic
        raise NotImplementedError(
            "Prediction generation not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def format_for_database(
        self,
        predictions: List[Dict[str, Any]],
        year: int,
        grand_prix: str,
        session: str = "Race"
    ) -> Dict[str, Any]:
        """
        Format predictions for database storage (JSONB format).

        TODO(human): Implement database formatting.

        Args:
            predictions: List of predictions from predict_race()
            year: Race year
            grand_prix: Grand Prix name
            session: Session type (default: "Race")

        Returns:
            Dictionary matching the database JSONB schema:
            {
                'predictions': [...],
                'podium': ['VER', 'NOR', 'LEC'],
                'model_metadata': {
                    'version': 'v1.0',
                    'mae': 12.34,
                    'feature_importance': {...}
                }
            }

        Implementation:
        ```python
        # Extract podium (top 3)
        podium = [pred['driver_abbr'] for pred in predictions[:3]]

        # Build model metadata
        model_metadata = {
            'version': self.model.model_version,
            'mae': self.model.mae,
            'feature_importance': self.model.feature_importances,
        }

        return {
            'predictions': predictions,
            'podium': podium,
            'model_metadata': model_metadata
        }
        ```
        """
        # TODO(human): Implement database formatting
        raise NotImplementedError(
            "Database formatting not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def predict_multiple_races(
        self,
        year: int,
        grand_prix_list: List[str],
        qualifying_data_dict: Dict[str, pd.DataFrame]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate predictions for multiple races (batch processing).

        TODO(human): (OPTIONAL) Implement batch prediction.

        This is OPTIONAL - only implement after single race prediction works.

        Args:
            year: Year of the races
            grand_prix_list: List of Grand Prix names
            qualifying_data_dict: Dict mapping GP name -> qualifying DataFrame

        Returns:
            Dict mapping GP name -> predictions list

        Implementation:
        ```python
        all_predictions = {}

        for gp in grand_prix_list:
            if gp not in qualifying_data_dict:
                logger.warning(f"No qualifying data for {gp}")
                continue

            predictions = self.predict_race(year, gp, qualifying_data_dict[gp])
            all_predictions[gp] = predictions

        return all_predictions
        ```
        """
        # TODO(human): (OPTIONAL) Implement batch prediction
        raise NotImplementedError("Batch prediction not yet implemented.")


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Prediction Generation Test")
    print("=" * 70 + "\n")

    print("⚠️  Prediction generation not yet implemented (TODO(human))")
    print("\nTo test after implementation, uncomment the code below:\n")

    # Uncomment after implementing predict_race()
    # from ml_models.data_loader import F1DataLoader, load_qualifying_for_prediction
    # from ml_models.feature_engineering import FeatureEngineer
    # from ml_models.model_trainer import RacePredictor
    #
    # # Load and train model
    # loader = F1DataLoader()
    # data = loader.load_historical_races(2018, 2024)
    # fe = FeatureEngineer(data)
    # features = fe.extract_all_training_features()
    #
    # predictor = RacePredictor()
    # predictor.train(features)
    #
    # # Load qualifying data
    # qualifying = load_qualifying_for_prediction(2024, 'Bahrain Grand Prix')
    #
    # # Generate predictions
    # pg = PredictionGenerator(predictor, fe)
    # predictions = pg.predict_race(2024, 'Bahrain Grand Prix', qualifying)
    #
    # # Display results
    # print(f"Predicted Results for 2024 Bahrain Grand Prix:")
    # print(f"{'Pos':<5} {'Driver':<10} {'Team':<25} {'Time (s)':<10}")
    # print("─" * 70)
    # for pred in predictions[:10]:  # Top 10
    #     print(f"{pred['position']:<5} {pred['driver_abbr']:<10} " +
    #           f"{pred['team']:<25} {pred['predicted_race_time_seconds']:<10.2f}")

    print("=" * 70)
