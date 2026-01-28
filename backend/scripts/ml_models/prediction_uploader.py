"""
Prediction Uploader for F1 Race Predictions

This module handles uploading ML-generated predictions to the Supabase database.
It formats predictions according to the race_predictions table schema and
handles upserts (insert or update if already exists).
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import logging
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

from ml_models.ml_config import (
    MODEL_VERSION,
    TRAINING_DATA_RANGE,
    FEATURE_COLUMNS,
    PREDICTIONS_TABLE,
    DEFAULT_SESSION,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PredictionUploader:
    """
    Uploads race predictions to Supabase database.

    Handles formatting predictions to match the race_predictions table schema
    and performs upsert operations (insert or update existing predictions).
    """

    def __init__(self, supabase_url: str = SUPABASE_URL, supabase_key: str = SUPABASE_SERVICE_KEY):
        """Initialize Supabase client connection."""
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not found. Check your .env file.")

        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("✓ PredictionUploader initialized")

    def upload_predictions(
        self,
        year: int,
        grand_prix: str,
        predictions: List[Dict[str, Any]],
        model_version: str = MODEL_VERSION,
        session: str = DEFAULT_SESSION,
        mae_score: Optional[float] = None,
        feature_importances: Optional[Dict[str, float]] = None
    ) -> bool:
        """
        Upload race predictions to the database.

        Args:
            year: Race year (e.g., 2025)
            grand_prix: Grand Prix name (e.g., "Bahrain Grand Prix")
            predictions: List of prediction dictionaries from PredictionGenerator
            model_version: Model version identifier
            session: Session type (default: "Race")
            mae_score: Model MAE score (optional)
            feature_importances: Feature importance dict (optional)

        Returns:
            True if upload successful, False otherwise
        """
        try:
            logger.info(f"Uploading predictions for {year} {grand_prix}...")

            # Format predictions for database
            predictions_json = self._format_predictions_json(
                predictions=predictions,
                model_version=model_version,
                mae_score=mae_score,
                feature_importances=feature_importances
            )

            # Prepare record for database
            record = {
                'year': year,
                'grand_prix': grand_prix,
                'session': session,
                'model_version': model_version,
                'training_data_range': TRAINING_DATA_RANGE,
                'features_used': FEATURE_COLUMNS,
                'mae_score': mae_score,
                'predictions': predictions_json,
            }

            # Check if prediction already exists
            existing = self.client.table(PREDICTIONS_TABLE) \
                .select("id") \
                .eq("year", year) \
                .eq("grand_prix", grand_prix) \
                .eq("session", session) \
                .eq("model_version", model_version) \
                .execute()

            if existing.data:
                # Update existing prediction
                prediction_id = existing.data[0]['id']
                response = self.client.table(PREDICTIONS_TABLE) \
                    .update(record) \
                    .eq("id", prediction_id) \
                    .execute()

                logger.info(f"✓ Updated existing prediction (ID: {prediction_id})")
            else:
                # Insert new prediction
                response = self.client.table(PREDICTIONS_TABLE) \
                    .insert(record) \
                    .execute()

                logger.info(f"✓ Inserted new prediction")

            # Verify upload
            if response.data:
                logger.info(f"  → Uploaded {len(predictions)} driver predictions")
                logger.info(f"  → Predicted podium: {predictions_json['podium']}")
                return True
            else:
                logger.error("Upload failed: No data returned from database")
                return False

        except Exception as e:
            logger.error(f"✗ Upload failed: {e}", exc_info=True)
            return False

    def _format_predictions_json(
        self,
        predictions: List[Dict[str, Any]],
        model_version: str,
        mae_score: Optional[float],
        feature_importances: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Format predictions to match database JSONB schema.

        Args:
            predictions: Raw predictions from PredictionGenerator
            model_version: Model version
            mae_score: Model MAE score
            feature_importances: Feature importance dict

        Returns:
            Dictionary matching database JSONB structure:
            {
                'predictions': [...],
                'podium': ['VER', 'NOR', 'LEC'],
                'model_metadata': {...}
            }
        """
        # Extract podium (top 3)
        podium = [pred['driver_abbr'] for pred in predictions[:3]]

        # Build model metadata
        model_metadata = {
            'version': model_version,
            'trained_on': TRAINING_DATA_RANGE,
            'features': FEATURE_COLUMNS,
        }

        if mae_score is not None:
            model_metadata['mae'] = round(mae_score, 2)

        if feature_importances:
            model_metadata['feature_importance'] = {
                k: round(v, 4) for k, v in feature_importances.items()
            }

        # Format predictions (clean up any NaN values)
        formatted_predictions = []
        for pred in predictions:
            formatted_pred = {
                'position': int(pred['position']),
                'driver_abbr': pred['driver_abbr'],
                'driver_name': pred.get('driver_name', ''),
                'team': pred.get('team', ''),
                'predicted_race_time_seconds': float(pred['predicted_race_time_seconds']),
                'qualifying_time': float(pred.get('qualifying_time', 0)),
                'qualifying_position': int(pred.get('qualifying_position', 0)),
                'features': pred.get('features', {}),
            }
            formatted_predictions.append(formatted_pred)

        return {
            'predictions': formatted_predictions,
            'podium': podium,
            'model_metadata': model_metadata,
        }

    def get_predictions(
        self,
        year: int,
        grand_prix: str,
        session: str = DEFAULT_SESSION,
        model_version: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve predictions from database.

        Args:
            year: Race year
            grand_prix: Grand Prix name
            session: Session type
            model_version: Specific model version (or latest if None)

        Returns:
            Predictions dict or None if not found
        """
        try:
            query = self.client.table(PREDICTIONS_TABLE) \
                .select("*") \
                .eq("year", year) \
                .eq("grand_prix", grand_prix) \
                .eq("session", session)

            if model_version:
                query = query.eq("model_version", model_version)

            response = query.order("created_at", desc=True).limit(1).execute()

            if response.data:
                return response.data[0]
            else:
                logger.warning(f"No predictions found for {year} {grand_prix}")
                return None

        except Exception as e:
            logger.error(f"Error retrieving predictions: {e}")
            return None

    def delete_predictions(
        self,
        year: int,
        grand_prix: str,
        session: str = DEFAULT_SESSION,
        model_version: Optional[str] = None
    ) -> bool:
        """
        Delete predictions from database.

        Args:
            year: Race year
            grand_prix: Grand Prix name
            session: Session type
            model_version: Specific model version (or all if None)

        Returns:
            True if deletion successful
        """
        try:
            query = self.client.table(PREDICTIONS_TABLE) \
                .delete() \
                .eq("year", year) \
                .eq("grand_prix", grand_prix) \
                .eq("session", session)

            if model_version:
                query = query.eq("model_version", model_version)

            response = query.execute()

            logger.info(f"✓ Deleted predictions for {year} {grand_prix}")
            return True

        except Exception as e:
            logger.error(f"✗ Delete failed: {e}")
            return False


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Prediction Uploader Test")
    print("=" * 70 + "\n")

    # Create mock predictions for testing
    mock_predictions = [
        {
            'position': 1,
            'driver_abbr': 'VER',
            'driver_name': 'Max Verstappen',
            'team': 'Red Bull Racing',
            'predicted_race_time_seconds': 5234.56,
            'qualifying_time': 78.234,
            'qualifying_position': 1,
            'features': {'qualifying_time': 78.234}
        },
        {
            'position': 2,
            'driver_abbr': 'NOR',
            'driver_name': 'Lando Norris',
            'team': 'McLaren',
            'predicted_race_time_seconds': 5245.12,
            'qualifying_time': 78.567,
            'qualifying_position': 2,
            'features': {'qualifying_time': 78.567}
        },
        {
            'position': 3,
            'driver_abbr': 'LEC',
            'driver_name': 'Charles Leclerc',
            'team': 'Ferrari',
            'predicted_race_time_seconds': 5250.00,
            'qualifying_time': 78.789,
            'qualifying_position': 3,
            'features': {'qualifying_time': 78.789}
        },
    ]

    try:
        uploader = PredictionUploader()

        print("Test 1: Upload mock predictions...")
        success = uploader.upload_predictions(
            year=2025,
            grand_prix="Test Grand Prix",
            predictions=mock_predictions,
            model_version="v1.0-test",
            mae_score=12.34,
            feature_importances={'qualifying_time': 1.0}
        )

        if success:
            print("  ✓ Upload successful\n")

            print("Test 2: Retrieve predictions...")
            retrieved = uploader.get_predictions(2025, "Test Grand Prix")
            if retrieved:
                print(f"  ✓ Retrieved predictions")
                print(f"  → Podium: {retrieved['predictions']['podium']}")
                print(f"  → MAE: {retrieved['mae_score']}\n")

            print("Test 3: Delete test predictions...")
            deleted = uploader.delete_predictions(2025, "Test Grand Prix")
            if deleted:
                print("  ✓ Test predictions deleted")
        else:
            print("  ✗ Upload failed")

    except Exception as e:
        print(f"✗ Test failed: {e}")

    print("\n" + "=" * 70)
