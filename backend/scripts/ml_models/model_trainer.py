"""
Model Training for F1 Race Predictions

This module trains a Gradient Boosting Regressor to predict F1 race finishing times.
Gradient Boosting builds an ensemble of decision trees sequentially, where each
tree corrects the errors of the previous trees.

TODO(human): Implement model training pipeline
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional, Any
import logging
import joblib
from pathlib import Path

# Scikit-learn imports
try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.preprocessing import StandardScaler
except ImportError:
    print("Error: scikit-learn not installed. Run: pip install scikit-learn")
    exit(1)

from ml_models.ml_config import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    CONTEXT_COLUMNS,
    GRADIENT_BOOSTING_PARAMS,
    TEST_SIZE,
    RANDOM_STATE,
    CV_FOLDS,
    MODEL_VERSION,
    MODEL_PATH,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RacePredictor:
    """
    Machine learning model for predicting F1 race finishing times.

    Uses Gradient Boosting Regression - an ensemble learning method that:
    1. Builds multiple decision trees sequentially
    2. Each tree learns from the errors of previous trees
    3. Final prediction is the sum of all tree predictions

    Why Gradient Boosting for F1?
    - Handles non-linear relationships (e.g., qualifying time vs race time)
    - Robust to outliers (safety cars, unusual weather)
    - Provides feature importance (which factors matter most)
    - No need for feature scaling (tree-based)
    """

    def __init__(self, model_version: str = MODEL_VERSION):
        """
        Initialize the race predictor.

        Args:
            model_version: Version identifier for the model (e.g., "v1.0")
        """
        self.model_version = model_version
        self.model: Optional[GradientBoostingRegressor] = None
        self.scaler: Optional[StandardScaler] = None  # Optional: for feature scaling
        self.feature_names: List[str] = []
        self.feature_importances: Dict[str, float] = {}
        self.mae: Optional[float] = None
        self.rmse: Optional[float] = None
        self.r2: Optional[float] = None

        logger.info(f"RacePredictor initialized (version: {model_version})")

    def train(
        self,
        training_data: pd.DataFrame,
        feature_cols: List[str] = FEATURE_COLUMNS,
        target_col: str = TARGET_COLUMN,
        test_split: float = TEST_SIZE,
        use_cv: bool = True
    ) -> Dict[str, Any]:
        """
        Train Gradient Boosting model on historical race data.

        TODO(human): Implement model training logic.

        This is the CORE of your ML pipeline. Your task is to:
        1. Split data into features (X) and target (y)
        2. Split into train and test sets
        3. Initialize and train GradientBoostingRegressor
        4. Evaluate on test set (calculate MAE, RMSE, R²)
        5. Extract feature importances
        6. (Optional) Perform cross-validation

        Args:
            training_data: DataFrame with features and target
            feature_cols: List of column names to use as features
            target_col: Column name of target variable
            test_split: Fraction of data to use for testing (0.0-1.0)
            use_cv: Whether to perform cross-validation

        Returns:
            Dictionary with training results:
                {
                    'train_mae': float,
                    'test_mae': float,
                    'train_rmse': float,
                    'test_rmse': float,
                    'r2_score': float,
                    'cv_scores': list (if use_cv=True),
                    'feature_importances': dict
                }

        Implementation Guidance:
        ────────────────────────────────────────────────────────────────────
        1. PREPARE DATA:
           ```python
           # Extract features and target
           X = training_data[feature_cols].copy()
           y = training_data[target_col].copy()

           # Remove rows with missing values
           valid_mask = X.notna().all(axis=1) & y.notna()
           X = X[valid_mask]
           y = y[valid_mask]

           logger.info(f"Training on {len(X)} samples with {len(feature_cols)} features")
           ```

        2. TRAIN/TEST SPLIT:
           Use temporal split for time-series data (train on older, test on recent):
           ```python
           # Option A: Temporal split (better for time-series)
           # Sort by year, then split
           # training_data = training_data.sort_values(['year', 'grand_prix'])
           # split_idx = int(len(X) * (1 - test_split))
           # X_train, X_test = X[:split_idx], X[split_idx:]
           # y_train, y_test = y[:split_idx], y[split_idx:]

           # Option B: Random split (simpler to start)
           X_train, X_test, y_train, y_test = train_test_split(
               X, y, test_size=test_split, random_state=RANDOM_STATE
           )
           ```

        3. INITIALIZE MODEL:
           ```python
           self.model = GradientBoostingRegressor(
               **GRADIENT_BOOSTING_PARAMS
           )
           self.feature_names = feature_cols
           ```

        4. TRAIN MODEL:
           ```python
           logger.info("Training Gradient Boosting model...")
           self.model.fit(X_train, y_train)
           logger.info("✓ Training complete")
           ```

        5. EVALUATE:
           ```python
           # Predictions
           y_train_pred = self.model.predict(X_train)
           y_test_pred = self.model.predict(X_test)

           # Metrics
           train_mae = mean_absolute_error(y_train, y_train_pred)
           test_mae = mean_absolute_error(y_test, y_test_pred)
           train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
           test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
           r2 = r2_score(y_test, y_test_pred)

           self.mae = test_mae  # Store for later use

           logger.info(f"  Train MAE: {train_mae:.2f} seconds")
           logger.info(f"  Test MAE:  {test_mae:.2f} seconds")
           logger.info(f"  Test RMSE: {test_rmse:.2f} seconds")
           logger.info(f"  R² Score:  {r2:.3f}")
           ```

        6. FEATURE IMPORTANCES:
           ```python
           # Extract feature importances from the model
           importances = self.model.feature_importances_
           self.feature_importances = dict(zip(feature_cols, importances))

           logger.info("Feature importances:")
           for feat, importance in sorted(
               self.feature_importances.items(),
               key=lambda x: x[1],
               reverse=True
           ):
               logger.info(f"  {feat}: {importance:.3f}")
           ```

        7. CROSS-VALIDATION (optional but recommended):
           ```python
           if use_cv:
               cv_scores = cross_val_score(
                   self.model, X, y,
                   cv=CV_FOLDS,
                   scoring='neg_mean_absolute_error'
               )
               cv_mae = -cv_scores.mean()
               logger.info(f"  Cross-validation MAE: {cv_mae:.2f} ± {cv_scores.std():.2f}")
           ```

        Understanding the Metrics:
        ────────────────────────────────────────────────────────────────────
        - MAE (Mean Absolute Error): Average time difference in seconds
          → Lower is better. Target: < 20 seconds
          → Example: MAE of 15 means predictions are off by 15 seconds on average

        - RMSE (Root Mean Squared Error): Penalizes large errors more
          → Lower is better. Usually higher than MAE
          → Sensitive to outliers (e.g., unusual race times)

        - R² Score: How well the model explains variance (0.0 to 1.0)
          → Higher is better. Target: > 0.6
          → 0.8 means model explains 80% of race time variance

        - Feature Importance: Which features matter most
          → Sum to 1.0. Higher = more influential
          → Example: {qualifying_time: 0.85} means qualifying dominates

        Trade-offs to Consider:
        ────────────────────────────────────────────────────────────────────
        1. Train/Test Split:
           - Temporal (train on 2018-2023, test on 2024):
             ✓ Realistic (mimics real prediction)
             ✗ Less data for training
           - Random (shuffle all data):
             ✓ More training data
             ✗ Data leakage risk (future in training)

        2. Feature Scaling:
           - Tree-based models (Gradient Boosting) don't require scaling
           - But it doesn't hurt and may help if you switch models later
           - Uncomment scaling code if you want to try it

        3. Overfitting Detection:
           - Train MAE << Test MAE → Model memorizing training data
           - Solution: Reduce max_depth, increase min_samples_split
           - Cross-validation helps detect this

        Testing Your Implementation:
        ─────────────────────────────────────────────────────────────────────
        ```bash
        python -c "from ml_models.data_loader import F1DataLoader; \\
                   from ml_models.feature_engineering import FeatureEngineer; \\
                   from ml_models.model_trainer import RacePredictor; \\
                   loader = F1DataLoader(); \\
                   data = loader.load_historical_races(2018, 2024); \\
                   fe = FeatureEngineer(data); \\
                   features = fe.extract_all_training_features(); \\
                   predictor = RacePredictor(); \\
                   results = predictor.train(features); \\
                   print(results)"
        ```
        """
        # TODO(human): Implement training logic here
        raise NotImplementedError(
            "Model training not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """
        Generate race time predictions for new data.

        TODO(human): Implement prediction logic.

        Args:
            features: DataFrame with feature columns (same as training)

        Returns:
            NumPy array of predicted race times in seconds

        Implementation:
        ```python
        if self.model is None:
            raise ValueError("Model not trained. Call train() first or load_model()")

        X = features[self.feature_names].copy()

        # Optional: Apply scaling if used during training
        # if self.scaler is not None:
        #     X = self.scaler.transform(X)

        predictions = self.model.predict(X)
        return predictions
        ```
        """
        # TODO(human): Implement prediction logic
        raise NotImplementedError(
            "Prediction not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def save_model(self, path: Path = MODEL_PATH) -> None:
        """
        Save trained model to disk using joblib.

        TODO(human): Implement model saving.

        Args:
            path: File path to save model

        Implementation:
        ```python
        if self.model is None:
            raise ValueError("No model to save. Train a model first.")

        # Save model and metadata
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importances': self.feature_importances,
            'model_version': self.model_version,
            'mae': self.mae,
            'rmse': self.rmse,
            'r2': self.r2,
        }

        joblib.dump(model_data, path)
        logger.info(f"✓ Model saved to {path}")
        ```
        """
        # TODO(human): Implement model saving
        raise NotImplementedError("Model saving not yet implemented.")

    def load_model(self, path: Path = MODEL_PATH) -> None:
        """
        Load trained model from disk.

        TODO(human): Implement model loading.

        Args:
            path: File path to load model from

        Implementation:
        ```python
        if not path.exists():
            raise FileNotFoundError(f"Model file not found: {path}")

        model_data = joblib.load(path)

        self.model = model_data['model']
        self.scaler = model_data.get('scaler')
        self.feature_names = model_data['feature_names']
        self.feature_importances = model_data['feature_importances']
        self.model_version = model_data['model_version']
        self.mae = model_data.get('mae')
        self.rmse = model_data.get('rmse')
        self.r2 = model_data.get('r2')

        logger.info(f"✓ Model loaded from {path} (version: {self.model_version})")
        ```
        """
        # TODO(human): Implement model loading
        raise NotImplementedError("Model loading not yet implemented.")


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Model Training Test")
    print("=" * 70 + "\n")

    print("⚠️  Model training not yet implemented (TODO(human))")
    print("\nTo test after implementation, uncomment the code below:\n")

    # Uncomment after implementing train()
    # from ml_models.data_loader import F1DataLoader
    # from ml_models.feature_engineering import FeatureEngineer
    #
    # loader = F1DataLoader()
    # data = loader.load_historical_races(2018, 2024)
    #
    # fe = FeatureEngineer(data)
    # training_features = fe.extract_all_training_features()
    #
    # predictor = RacePredictor()
    # results = predictor.train(training_features)
    #
    # print(f"Training Results:")
    # print(f"  Test MAE: {results['test_mae']:.2f} seconds")
    # print(f"  R² Score: {results['r2_score']:.3f}")
    # print(f"  Feature Importances: {results['feature_importances']}")
    #
    # # Save model
    # predictor.save_model()

    print("=" * 70)
