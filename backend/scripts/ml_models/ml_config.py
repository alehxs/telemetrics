"""
ML Configuration and Constants for F1 Race Predictions

This module centralizes all configuration for the race prediction ML pipeline,
including data ranges, feature names, model parameters, and file paths.
"""

import os
from pathlib import Path
from typing import List, Dict, Any

# ============================================================================
# Directory Paths
# ============================================================================

# Base directory for ML models
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
SCRIPTS_DIR = BASE_DIR / "scripts"

# Ensure models directory exists
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# Data Configuration
# ============================================================================

# Historical data range for training
TRAINING_START_YEAR = 2018
TRAINING_END_YEAR = 2024
TRAINING_YEARS = list(range(TRAINING_START_YEAR, TRAINING_END_YEAR + 1))

# Prediction target year
PREDICTION_YEAR = 2025

# Data range label for metadata
TRAINING_DATA_RANGE = f"{TRAINING_START_YEAR}-{TRAINING_END_YEAR}"

# ============================================================================
# Feature Engineering Configuration
# ============================================================================

# Feature columns that will be used in the model
# USER NOTE: These are the features you'll extract in feature_engineering.py
FEATURE_COLUMNS = [
    "qualifying_time",           # Qualifying session time in seconds
    # Additional features can be added here by the user:
    # "qualifying_position",     # Grid position from qualifying
    # "avg_sector_time",         # Average sector time
    # "track_history_avg",       # Driver's average position at this track
    # "team_season_avg",         # Team's average position this season
    # "gap_to_pole",             # Time gap to pole position
]

# Target variable (what we're predicting)
TARGET_COLUMN = "race_time_seconds"  # Total race time in seconds

# Columns to include in output for context
CONTEXT_COLUMNS = [
    "driver_abbr",
    "driver_name",
    "team",
    "qualifying_position",
]

# ============================================================================
# Model Configuration
# ============================================================================

# Current model version
MODEL_VERSION = "v1.0"

# Model file naming
MODEL_FILENAME = f"race_predictor_{MODEL_VERSION}.pkl"
MODEL_PATH = MODELS_DIR / MODEL_FILENAME

# Gradient Boosting Hyperparameters
# USER NOTE: You can tune these in model_trainer.py
GRADIENT_BOOSTING_PARAMS = {
    "n_estimators": 100,         # Number of boosting stages
    "learning_rate": 0.1,        # Shrinks contribution of each tree
    "max_depth": 5,              # Maximum depth of individual trees
    "min_samples_split": 2,      # Minimum samples required to split node
    "min_samples_leaf": 1,       # Minimum samples required at leaf node
    "subsample": 0.8,            # Fraction of samples for fitting trees
    "random_state": 42,          # For reproducibility
    "verbose": 0,                # Logging verbosity
}

# Train/test split configuration
TEST_SIZE = 0.2                  # 20% of data for testing
RANDOM_STATE = 42                # For reproducible splits

# Cross-validation folds
CV_FOLDS = 5

# ============================================================================
# Prediction Configuration
# ============================================================================

# Session types to predict
PREDICTION_SESSIONS = ["Race"]  # Could add ["Sprint", "Qualifying"] later

# Minimum qualifying time threshold (to filter invalid data)
MIN_QUALIFYING_TIME = 60.0      # Seconds (e.g., < 1 minute is likely invalid)
MAX_QUALIFYING_TIME = 120.0     # Seconds (e.g., > 2 minutes is likely invalid)

# DNF handling
EXCLUDE_DNF_FROM_TRAINING = True  # Don't train on Did Not Finish results

# ============================================================================
# Evaluation Configuration
# ============================================================================

# Position accuracy tolerance (how many positions off is acceptable)
POSITION_TOLERANCE = 3  # Within ±3 positions is considered accurate

# MAE target (goal for Mean Absolute Error in seconds)
TARGET_MAE = 20.0  # Seconds

# Evaluation metrics to calculate
EVALUATION_METRICS = [
    "mae",                      # Mean Absolute Error
    "rmse",                     # Root Mean Squared Error
    "position_accuracy",        # % within POSITION_TOLERANCE
    "podium_accuracy",          # % of podium (top 3) correctly predicted
    "winner_accuracy",          # Binary: winner correct or not
]

# ============================================================================
# Database Configuration
# ============================================================================

# Table name for storing predictions
PREDICTIONS_TABLE = "race_predictions"

# Default session type
DEFAULT_SESSION = "Race"

# ============================================================================
# 2025 F1 Calendar (for prediction generation)
# ============================================================================

F1_2025_CALENDAR = [
    {"round": 1, "grand_prix": "Bahrain Grand Prix", "country": "Bahrain"},
    {"round": 2, "grand_prix": "Saudi Arabian Grand Prix", "country": "Saudi Arabia"},
    {"round": 3, "grand_prix": "Australian Grand Prix", "country": "Australia"},
    {"round": 4, "grand_prix": "Japanese Grand Prix", "country": "Japan"},
    {"round": 5, "grand_prix": "Chinese Grand Prix", "country": "China"},
    {"round": 6, "grand_prix": "Miami Grand Prix", "country": "United States"},
    {"round": 7, "grand_prix": "Emilia Romagna Grand Prix", "country": "Italy"},
    {"round": 8, "grand_prix": "Monaco Grand Prix", "country": "Monaco"},
    {"round": 9, "grand_prix": "Spanish Grand Prix", "country": "Spain"},
    {"round": 10, "grand_prix": "Canadian Grand Prix", "country": "Canada"},
    {"round": 11, "grand_prix": "Austrian Grand Prix", "country": "Austria"},
    {"round": 12, "grand_prix": "British Grand Prix", "country": "United Kingdom"},
    {"round": 13, "grand_prix": "Belgian Grand Prix", "country": "Belgium"},
    {"round": 14, "grand_prix": "Hungarian Grand Prix", "country": "Hungary"},
    {"round": 15, "grand_prix": "Dutch Grand Prix", "country": "Netherlands"},
    {"round": 16, "grand_prix": "Italian Grand Prix", "country": "Italy"},
    {"round": 17, "grand_prix": "Azerbaijan Grand Prix", "country": "Azerbaijan"},
    {"round": 18, "grand_prix": "Singapore Grand Prix", "country": "Singapore"},
    {"round": 19, "grand_prix": "United States Grand Prix", "country": "United States"},
    {"round": 20, "grand_prix": "Mexico City Grand Prix", "country": "Mexico"},
    {"round": 21, "grand_prix": "São Paulo Grand Prix", "country": "Brazil"},
    {"round": 22, "grand_prix": "Las Vegas Grand Prix", "country": "United States"},
    {"round": 23, "grand_prix": "Qatar Grand Prix", "country": "Qatar"},
    {"round": 24, "grand_prix": "Abu Dhabi Grand Prix", "country": "United Arab Emirates"},
]

# ============================================================================
# Logging Configuration
# ============================================================================

LOG_LEVEL = "INFO"  # Options: DEBUG, INFO, WARNING, ERROR

# ============================================================================
# Helper Functions
# ============================================================================

def get_model_path(version: str = MODEL_VERSION) -> Path:
    """Get the full path for a specific model version."""
    return MODELS_DIR / f"race_predictor_{version}.pkl"

def get_training_data_range() -> str:
    """Get formatted training data range string."""
    return TRAINING_DATA_RANGE

def get_all_features() -> List[str]:
    """Get list of all feature column names."""
    return FEATURE_COLUMNS.copy()

def get_gradient_boosting_params() -> Dict[str, Any]:
    """Get gradient boosting hyperparameters."""
    return GRADIENT_BOOSTING_PARAMS.copy()

def get_2025_races() -> List[Dict[str, Any]]:
    """Get list of 2025 F1 races."""
    return F1_2025_CALENDAR.copy()


if __name__ == "__main__":
    # Print configuration summary
    print("=" * 70)
    print("F1 Race Prediction Model Configuration")
    print("=" * 70)
    print(f"Training Data Range: {TRAINING_DATA_RANGE}")
    print(f"Model Version: {MODEL_VERSION}")
    print(f"Model Path: {MODEL_PATH}")
    print(f"Features: {', '.join(FEATURE_COLUMNS)}")
    print(f"Target: {TARGET_COLUMN}")
    print(f"Gradient Boosting Params: {GRADIENT_BOOSTING_PARAMS}")
    print(f"2025 Races: {len(F1_2025_CALENDAR)} rounds")
    print("=" * 70)
