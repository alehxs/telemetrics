"""
Train and run podium prediction model

Usage:
  python prediction_model.py --train
  python prediction_model.py --predict --year 2025 --gp "Monaco"
  python prediction_model.py --predict --year 2025 --gp "Emilia Romagna" --sprint
"""
import argparse
import json
import logging
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).parent))
from config import TEAM_MAPPINGS, DRIVER_HEADSHOT_URL, TEAM_LOGO_PATH
from data_transformers import DataTransformer
from feature_builder import FeatureBuilder
from supabase_uploader import SupabaseUploader

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent / 'models'
MODEL_PATH = MODELS_DIR / 'podium_model.pkl'
FEATURE_COLS_PATH = MODELS_DIR / 'feature_columns.json'

FEATURE_COLS = [
    'quali_position',
    'is_sprint_weekend',
    'driver_form_avg_pos_5',
    'driver_form_podium_rate_5',
    'track_avg_pos',
    'track_podium_rate',
    'constructor_form_avg_pos_5',
    'constructor_podium_rate_5',
    'dnf_rate_season',
    'season_points_rank',
    'is_street_circuit',
]


def _normalize_team_name(team: str) -> str:
    return TEAM_MAPPINGS.get(team, team)


def _get_team_logo_path(team: str) -> str:
    normalized = _normalize_team_name(team)
    filename = normalized.lower().replace(' ', '_')
    return TEAM_LOGO_PATH.format(team=filename)


def _get_driver_headshot_url(driver_abbr: str) -> str:
    return DRIVER_HEADSHOT_URL.format(driver=driver_abbr.upper())


def train():
    MODELS_DIR.mkdir(exist_ok=True)
    builder = FeatureBuilder()
    df = builder.build_training_data()

    train_df = df[df['year'] <= 2024].copy()
    holdout_df = df[df['year'] == 2025].copy()

    missing = [c for c in FEATURE_COLS if c not in train_df.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")

    X_train = train_df[FEATURE_COLS]
    y_train = train_df['is_podium']

    model = LGBMClassifier(
        n_estimators=400,
        learning_rate=0.05,
        num_leaves=31,
        min_child_samples=20,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    if not holdout_df.empty:
        X_holdout = holdout_df[FEATURE_COLS]
        y_holdout = holdout_df['is_podium']
        proba = model.predict_proba(X_holdout)[:, 1]
        auc = roc_auc_score(y_holdout, proba)
        logger.info(f"2025 holdout AUC-ROC: {auc:.4f}")
    else:
        logger.warning("No 2025 holdout data available")

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    with open(FEATURE_COLS_PATH, 'w') as f:
        json.dump(FEATURE_COLS, f)

    logger.info(f"Model saved to {MODEL_PATH}")
    logger.info(f"Feature columns saved to {FEATURE_COLS_PATH}")


def predict(year: int, gp: str, is_sprint: bool = False):
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"No trained model found at {MODEL_PATH}. Run --train first.")

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    with open(FEATURE_COLS_PATH) as f:
        feature_cols = json.load(f)

    builder = FeatureBuilder()

    quali_session = 'Sprint Qualifying' if is_sprint else 'Qualifying'
    resp = builder.client.table('telemetry_data').select('payload').eq('year', year).eq('grand_prix', gp).eq('session', quali_session).eq('data_type', 'session_results').single().execute()

    if not resp.data:
        raise ValueError(f"No {quali_session} session_results found for {year} {gp}")

    quali_payload = resp.data['payload']
    if isinstance(quali_payload, str):
        quali_payload = json.loads(quali_payload)

    team_colors_resp = builder.client.table('telemetry_data').select('payload').eq('year', year).eq('grand_prix', gp).eq('session', quali_session).eq('data_type', 'session_results').execute()

    features_df = builder.build_prediction_features(year, gp, quali_payload, is_sprint=is_sprint)

    X = features_df[feature_cols]
    proba = model.predict_proba(X)[:, 1]
    features_df['PodiumProbability'] = proba
    features_df['QualifyingPosition'] = features_df['quali_position']

    top3 = features_df.nlargest(3, 'PodiumProbability').reset_index(drop=True)

    quali_color_map = {d['Abbreviation']: d.get('TeamColor', '#CCCCCC') for d in quali_payload}

    payload = []
    for rank, row in enumerate(top3.itertuples(), start=1):
        abbr = row.Abbreviation
        team = _normalize_team_name(row.TeamName)
        team_color = quali_color_map.get(abbr, '#CCCCCC')
        if not team_color.startswith('#'):
            team_color = f'#{team_color}'

        payload.append({
            'PredictedPosition': rank,
            'Abbreviation': abbr,
            'TeamName': team,
            'TeamColor': team_color,
            'TeamLogo': _get_team_logo_path(team),
            'HeadshotUrl': _get_driver_headshot_url(abbr),
            'PodiumProbability': round(float(row.PodiumProbability), 4),
            'QualifyingPosition': int(row.QualifyingPosition) if not np.isnan(row.QualifyingPosition) else 0,
        })

    target_session = 'Sprint' if is_sprint else 'Race'
    uploader = SupabaseUploader()
    success = uploader.upload_data(year, gp, target_session, 'prediction_podium', payload)

    if success:
        logger.info(f"Prediction uploaded: {year} {gp} {target_session}")
        for p in payload:
            logger.info(f"  P{p['PredictedPosition']}: {p['Abbreviation']} ({p['PodiumProbability']*100:.1f}%)")
    else:
        logger.error("Upload failed")


def main():
    parser = argparse.ArgumentParser(description='F1 podium prediction model')
    parser.add_argument('--train', action='store_true', help='Train and save model')
    parser.add_argument('--predict', action='store_true', help='Run prediction for a GP')
    parser.add_argument('--year', type=int)
    parser.add_argument('--gp', type=str)
    parser.add_argument('--sprint', action='store_true', help='Sprint race prediction')
    args = parser.parse_args()

    if args.train:
        train()
    elif args.predict:
        if not args.year or not args.gp:
            parser.error("--predict requires --year and --gp")
        predict(args.year, args.gp, is_sprint=args.sprint)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
