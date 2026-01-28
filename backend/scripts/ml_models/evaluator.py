"""
Model Evaluation for F1 Race Predictions

This module evaluates the accuracy of race predictions by comparing them
against actual race results. It calculates domain-specific metrics beyond
standard ML metrics (MAE, RMSE) to assess real-world performance.

TODO(human): Implement model evaluation pipeline
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
import logging
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ml_models.ml_config import POSITION_TOLERANCE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelEvaluator:
    """
    Evaluates race prediction accuracy against actual results.

    F1-specific metrics go beyond standard ML metrics:
    - MAE: How far off are predicted times? (standard ML metric)
    - Position Accuracy: Are drivers predicted in roughly correct positions?
    - Podium Accuracy: Do we correctly predict top 3?
    - Winner Accuracy: Do we predict the race winner?

    These metrics matter more for F1 fans than raw time predictions.
    """

    def __init__(self):
        """Initialize the evaluator."""
        self.evaluation_history: List[Dict[str, Any]] = []

    def evaluate_predictions(
        self,
        predictions: List[Dict[str, Any]],
        actual_results: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Calculate evaluation metrics by comparing predictions to actual results.

        TODO(human): Implement evaluation logic.

        This method measures how good your model is at predicting F1 races.
        Your task is to:
        1. Match predictions with actual results
        2. Calculate time-based errors (MAE, RMSE)
        3. Calculate position-based accuracy
        4. Calculate podium/winner accuracy
        5. Identify biggest misses

        Args:
            predictions: List of predictions from PredictionGenerator
                Each dict contains:
                    - position: Predicted position
                    - driver_abbr: Driver code
                    - predicted_race_time_seconds: Predicted time

            actual_results: DataFrame with actual race results containing:
                - driver_abbr: Driver code
                - position: Actual finishing position
                - race_time_seconds: Actual race time

        Returns:
            Dictionary with evaluation metrics:
            {
                'mae': 12.34,                    # Mean Absolute Error (seconds)
                'rmse': 15.67,                   # Root Mean Squared Error (seconds)
                'position_accuracy': 0.65,       # % within ±POSITION_TOLERANCE
                'position_mae': 2.1,             # Average position difference
                'podium_accuracy': 0.67,         # % of podium (top 3) correct
                'podium_exact': False,           # Exact podium match
                'winner_correct': True,          # Predicted winner matches actual
                'predicted_podium': ['VER', 'NOR', 'LEC'],
                'actual_podium': ['VER', 'LEC', 'NOR'],
                'biggest_misses': [              # Top 3 worst predictions
                    {'driver': 'GAS', 'predicted': 8, 'actual': 15, 'diff': 7},
                    ...
                ]
            }

        Implementation Guidance:
        ────────────────────────────────────────────────────────────────────
        1. MERGE PREDICTIONS WITH ACTUAL RESULTS:
           ```python
           # Convert predictions to DataFrame
           pred_df = pd.DataFrame(predictions)
           pred_df = pred_df.rename(columns={'position': 'predicted_position'})

           # Merge with actual results
           merged = pred_df.merge(
               actual_results[['driver_abbr', 'position', 'race_time_seconds']],
               on='driver_abbr',
               how='inner'
           )
           merged = merged.rename(columns={'position': 'actual_position'})

           if merged.empty:
               logger.error("No matching drivers between predictions and actual results")
               return {}

           logger.info(f"Evaluating {len(merged)} driver predictions")
           ```

        2. TIME-BASED METRICS (MAE, RMSE):
           ```python
           # Only evaluate drivers who finished (have valid race times)
           finished = merged[merged['race_time_seconds'].notna()].copy()

           if len(finished) > 0:
               mae = mean_absolute_error(
                   finished['race_time_seconds'],
                   finished['predicted_race_time_seconds']
               )
               rmse = np.sqrt(mean_squared_error(
                   finished['race_time_seconds'],
                   finished['predicted_race_time_seconds']
               ))
           else:
               mae = None
               rmse = None

           logger.info(f"  MAE:  {mae:.2f} seconds")
           logger.info(f"  RMSE: {rmse:.2f} seconds")
           ```

        3. POSITION ACCURACY:
           ```python
           # Calculate position differences
           merged['position_diff'] = abs(
               merged['predicted_position'] - merged['actual_position']
           )

           # Position MAE
           position_mae = merged['position_diff'].mean()

           # % within tolerance (e.g., within ±3 positions)
           within_tolerance = (merged['position_diff'] <= POSITION_TOLERANCE).sum()
           position_accuracy = within_tolerance / len(merged)

           logger.info(f"  Position MAE: {position_mae:.2f} positions")
           logger.info(f"  Position Accuracy (±{POSITION_TOLERANCE}): " +
                      f"{position_accuracy:.1%}")
           ```

        4. PODIUM ACCURACY:
           ```python
           # Get predicted and actual podiums (top 3)
           predicted_podium = [p['driver_abbr'] for p in predictions[:3]]
           actual_podium = actual_results.nsmallest(3, 'position')['driver_abbr'].tolist()

           # Count how many podium spots are correct (order doesn't matter)
           podium_matches = len(set(predicted_podium) & set(actual_podium))
           podium_accuracy = podium_matches / 3.0

           # Check if exact podium match (same order)
           podium_exact = predicted_podium == actual_podium

           logger.info(f"  Podium Accuracy: {podium_matches}/3 correct")
           logger.info(f"  Predicted: {predicted_podium}")
           logger.info(f"  Actual:    {actual_podium}")
           ```

        5. WINNER ACCURACY:
           ```python
           predicted_winner = predictions[0]['driver_abbr']
           actual_winner = actual_results[actual_results['position'] == 1]['driver_abbr'].iloc[0]

           winner_correct = predicted_winner == actual_winner

           logger.info(f"  Winner: {predicted_winner} vs {actual_winner} " +
                      f"({'✓' if winner_correct else '✗'})")
           ```

        6. IDENTIFY BIGGEST MISSES:
           ```python
           # Sort by position difference
           biggest_misses = merged.nlargest(3, 'position_diff')[
               ['driver_abbr', 'predicted_position', 'actual_position', 'position_diff']
           ]

           misses_list = [
               {
                   'driver': row['driver_abbr'],
                   'predicted': int(row['predicted_position']),
                   'actual': int(row['actual_position']),
                   'diff': int(row['position_diff'])
               }
               for _, row in biggest_misses.iterrows()
           ]

           logger.info("  Biggest Misses:")
           for miss in misses_list:
               logger.info(f"    {miss['driver']}: P{miss['predicted']} → " +
                          f"P{miss['actual']} (off by {miss['diff']})")
           ```

        7. RETURN RESULTS:
           ```python
           results = {
               'mae': mae,
               'rmse': rmse,
               'position_accuracy': position_accuracy,
               'position_mae': position_mae,
               'podium_accuracy': podium_accuracy,
               'podium_exact': podium_exact,
               'winner_correct': winner_correct,
               'predicted_podium': predicted_podium,
               'actual_podium': actual_podium,
               'biggest_misses': misses_list,
               'num_drivers': len(merged),
           }

           return results
           ```

        Understanding the Metrics:
        ────────────────────────────────────────────────────────────────────
        1. MAE (Mean Absolute Error):
           - Average time difference in seconds
           - Target: < 20 seconds
           - Interpretation: How far off are race time predictions?

        2. Position Accuracy:
           - % of drivers predicted within ±N positions
           - Target: > 60% within ±3 positions
           - Interpretation: Are drivers in roughly the right spots?

        3. Podium Accuracy:
           - How many of top 3 are correctly predicted?
           - Target: 2/3 or better
           - Most important for fans (who cares about P15 vs P17?)

        4. Winner Accuracy:
           - Binary: Did we predict the race winner?
           - Target: 50%+ across season
           - Hardest metric (margins are tiny at the top)

        Edge Cases to Handle:
        ────────────────────────────────────────────────────────────────────
        1. DNFs (Did Not Finish):
           - Driver predicted P5 but DNF'd
           - Solution: Exclude from time-based metrics (MAE/RMSE)
           - Include in position metrics with penalty (e.g., position = 20)

        2. Missing Drivers:
           - Driver in predictions but not in actual results
           - Or vice versa (driver in results but not predicted)
           - Solution: Only evaluate drivers present in both

        3. Sprint Races:
           - Shorter races, different dynamics
           - Consider separate evaluation for sprint vs full race

        Testing Your Implementation:
        ─────────────────────────────────────────────────────────────────────
        ```python
        from ml_models.data_loader import F1DataLoader
        from ml_models.evaluator import ModelEvaluator

        # Load actual results
        loader = F1DataLoader()
        actual_results = loader.load_session_results(2024, 2024, "Race")
        bahrain_results = actual_results[
            actual_results['grand_prix'] == 'Bahrain Grand Prix'
        ]

        # Create mock predictions (replace with real predictions later)
        mock_predictions = [
            {'position': 1, 'driver_abbr': 'VER', 'predicted_race_time_seconds': 5234.56},
            {'position': 2, 'driver_abbr': 'PER', 'predicted_race_time_seconds': 5245.12},
            # ... more predictions
        ]

        # Evaluate
        evaluator = ModelEvaluator()
        results = evaluator.evaluate_predictions(mock_predictions, bahrain_results)

        print(f"MAE: {results['mae']:.2f}s")
        print(f"Position Accuracy: {results['position_accuracy']:.1%}")
        print(f"Podium: {results['predicted_podium']} vs {results['actual_podium']}")
        ```
        """
        # TODO(human): Implement evaluation logic here
        raise NotImplementedError(
            "Evaluation logic not yet implemented. "
            "See docstring above for implementation guidance."
        )

    def evaluate_season(
        self,
        year: int,
        predictions_dict: Dict[str, List[Dict[str, Any]]],
        actual_results: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Evaluate predictions across an entire season.

        TODO(human): (OPTIONAL) Implement season-level evaluation.

        This is OPTIONAL - only implement after single race evaluation works.

        Args:
            year: Season year
            predictions_dict: Dict mapping GP name -> predictions list
            actual_results: DataFrame with all actual race results for the season

        Returns:
            Dictionary with season-level metrics:
            {
                'season_mae': 15.2,
                'season_position_accuracy': 0.68,
                'podium_accuracy': 0.71,
                'winner_accuracy': 0.58,
                'races_evaluated': 24,
                'by_race': {
                    'Bahrain Grand Prix': {...},
                    'Saudi Arabian Grand Prix': {...},
                    ...
                }
            }

        Implementation:
        ```python
        all_race_results = []

        for gp, predictions in predictions_dict.items():
            # Get actual results for this GP
            gp_results = actual_results[
                (actual_results['year'] == year) &
                (actual_results['grand_prix'] == gp)
            ]

            if gp_results.empty:
                logger.warning(f"No actual results for {gp}")
                continue

            # Evaluate this race
            race_eval = self.evaluate_predictions(predictions, gp_results)
            race_eval['grand_prix'] = gp
            all_race_results.append(race_eval)

        # Aggregate metrics
        season_mae = np.mean([r['mae'] for r in all_race_results if r['mae']])
        season_position_acc = np.mean([r['position_accuracy'] for r in all_race_results])
        season_podium_acc = np.mean([r['podium_accuracy'] for r in all_race_results])
        season_winner_acc = np.mean([r['winner_correct'] for r in all_race_results])

        return {
            'season_mae': season_mae,
            'season_position_accuracy': season_position_acc,
            'podium_accuracy': season_podium_acc,
            'winner_accuracy': season_winner_acc,
            'races_evaluated': len(all_race_results),
            'by_race': {r['grand_prix']: r for r in all_race_results}
        }
        ```
        """
        # TODO(human): (OPTIONAL) Implement season evaluation
        raise NotImplementedError("Season evaluation not yet implemented.")


# ============================================================================
# Testing / CLI
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Model Evaluation Test")
    print("=" * 70 + "\n")

    print("⚠️  Model evaluation not yet implemented (TODO(human))")
    print("\nTo test after implementation, uncomment the code below:\n")

    # Uncomment after implementing evaluate_predictions()
    # from ml_models.data_loader import F1DataLoader
    #
    # # Load actual results
    # loader = F1DataLoader()
    # actual_results = loader.load_session_results(2024, 2024, "Race")
    # bahrain_results = actual_results[
    #     actual_results['grand_prix'] == 'Bahrain Grand Prix'
    # ]
    #
    # # Create mock predictions
    # mock_predictions = [
    #     {'position': 1, 'driver_abbr': 'VER', 'predicted_race_time_seconds': 5234.56},
    #     {'position': 2, 'driver_abbr': 'SAI', 'predicted_race_time_seconds': 5245.12},
    #     {'position': 3, 'driver_abbr': 'LEC', 'predicted_race_time_seconds': 5250.00},
    #     # ... add more mock predictions for all drivers
    # ]
    #
    # # Evaluate
    # evaluator = ModelEvaluator()
    # results = evaluator.evaluate_predictions(mock_predictions, bahrain_results)
    #
    # print(f"\nEvaluation Results:")
    # print(f"  MAE: {results['mae']:.2f} seconds")
    # print(f"  Position Accuracy: {results['position_accuracy']:.1%}")
    # print(f"  Podium Accuracy: {results['podium_accuracy']:.1%}")
    # print(f"  Winner Correct: {results['winner_correct']}")
    # print(f"  Predicted Podium: {results['predicted_podium']}")
    # print(f"  Actual Podium: {results['actual_podium']}")

    print("=" * 70)
