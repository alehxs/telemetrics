# F1 Race Prediction ML Pipeline

## 🎯 Overview

This ML pipeline predicts F1 race results using **Gradient Boosting Regression**, trained on historical race data (2018-2024). Your task is to implement the core ML components as a hands-on learning exercise.

## 📁 Project Structure

```
backend/scripts/ml_models/
├── ml_config.py              ✓ [Complete] Configuration constants
├── data_loader.py            ✓ [Complete] Load historical data from Supabase
├── feature_engineering.py    ⚠️ [TODO(human)] Extract ML features
├── model_trainer.py          ⚠️ [TODO(human)] Train Gradient Boosting
├── predictor.py              ⚠️ [TODO(human)] Generate predictions
├── evaluator.py              ⚠️ [TODO(human)] Evaluate model accuracy
└── prediction_uploader.py    ✓ [Complete] Upload to database

backend/scripts/
└── predict_race.py           ✓ [Complete] CLI orchestrator

backend/
├── setup_predictions_table.sql ✓ [Complete] Database schema
└── requirements.txt            ✓ [Complete] Python dependencies

frontend/src/
├── types/predictions.ts        ✓ [Complete] TypeScript interfaces
├── services/predictionsService.ts ✓ [Complete] API service
└── components/RacePredictions.tsx ✓ [Complete] Display component
```

## 🚀 Quick Start

### 1. Set Up Database

```bash
# Run the SQL schema to create race_predictions table
cd backend
psql <your-supabase-connection-string> < setup_predictions_table.sql

# Or use Supabase Dashboard:
# → SQL Editor → Copy contents of setup_predictions_table.sql → Run
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Test Infrastructure (Before ML Implementation)

```bash
cd backend/scripts

# Test data loading
python -c "from ml_models.data_loader import F1DataLoader; \\
           loader = F1DataLoader(); \\
           data = loader.load_historical_races(2023, 2024); \\
           print(f'Loaded {len(data[\"merged\"])} records')"

# Test ML config
python ml_models/ml_config.py

# Test prediction uploader (with mock data)
python ml_models/prediction_uploader.py
```

## 🎓 Your ML Implementation Tasks

You'll implement **4 core files** in order:

### Task 1: Feature Engineering (`feature_engineering.py`)

**What to implement:**
- `FeatureEngineer.extract_features()` - Extract features for a single race
- `FeatureEngineer.extract_all_training_features()` - Extract for all historical races

**Start simple:**
```python
# Step 1: Filter data for the target race
race_data = self.merged[
    (self.merged['year'] == year) &
    (self.merged['grand_prix'] == grand_prix)
].copy()

# Step 2: Select feature columns
features_df = race_data[['driver_abbr', 'driver_name', 'team', 'qualifying_time']].copy()

# Step 3: Add target variable
if for_training:
    features_df['race_time_seconds'] = race_data['race_time_seconds']
    features_df = features_df.dropna(subset=['race_time_seconds'])

return features_df
```

**Success criteria:**
- Returns DataFrame with driver context + qualifying_time feature
- Includes race_time_seconds target when for_training=True
- No missing values in critical columns

### Task 2: Model Training (`model_trainer.py`)

**What to implement:**
- `RacePredictor.train()` - Train Gradient Boosting model
- `RacePredictor.predict()` - Generate predictions from features
- `RacePredictor.save_model()` / `load_model()` - Model persistence

**Core training loop:**
```python
# 1. Prepare data
X = training_data[FEATURE_COLUMNS]
y = training_data[TARGET_COLUMN]

# 2. Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
)

# 3. Initialize and train
self.model = GradientBoostingRegressor(**GRADIENT_BOOSTING_PARAMS)
self.model.fit(X_train, y_train)

# 4. Evaluate
y_pred = self.model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)

# 5. Extract feature importances
self.feature_importances = dict(zip(FEATURE_COLUMNS, self.model.feature_importances_))
```

**Success criteria:**
- MAE < 20 seconds on test set
- Model trains without errors
- Feature importances extracted
- Model can be saved and loaded

### Task 3: Prediction Generation (`predictor.py`)

**What to implement:**
- `PredictionGenerator.predict_race()` - Generate predictions for a race
- `PredictionGenerator.format_for_database()` - Format for DB storage

**Prediction flow:**
```python
# 1. Extract features from qualifying data
features_df = qualifying_data[['driver_abbr', 'driver_name', 'team', 'qualifying_time']].copy()

# 2. Generate predictions
predicted_times = self.model.predict(features_df)
features_df['predicted_race_time_seconds'] = predicted_times

# 3. Rank by time
features_df = features_df.sort_values('predicted_race_time_seconds')
features_df['position'] = range(1, len(features_df) + 1)

# 4. Format output
predictions = features_df.to_dict('records')
return predictions
```

**Success criteria:**
- Predictions ranked correctly (lowest time = P1)
- All drivers have valid predictions
- Output format matches database schema

### Task 4: Model Evaluation (`evaluator.py`)

**What to implement:**
- `ModelEvaluator.evaluate_predictions()` - Compare predictions vs actual results

**Evaluation metrics:**
```python
# 1. Merge predictions with actual results
merged = pred_df.merge(actual_results, on='driver_abbr')

# 2. Calculate MAE (time-based)
mae = mean_absolute_error(merged['race_time_seconds'], merged['predicted_race_time_seconds'])

# 3. Calculate position accuracy
position_diff = abs(merged['predicted_position'] - merged['actual_position'])
position_accuracy = (position_diff <= 3).sum() / len(merged)

# 4. Check podium accuracy
predicted_podium = predictions[:3]
actual_podium = actual_results.nsmallest(3, 'position')['driver_abbr'].tolist()
podium_matches = len(set(predicted_podium) & set(actual_podium))
```

**Success criteria:**
- MAE calculation works
- Position accuracy calculated (% within ±3 positions)
- Podium accuracy calculated (how many of top 3 correct)

## 🔄 Complete Workflow

Once you've implemented all 4 tasks:

```bash
# 1. Train the model
python predict_race.py train --save-model --cross-validate

# Expected output:
# ✓ Loaded 420 historical race records
# ✓ Extracted features for 420 samples
# ✓ Training complete
#   Test MAE: 15.23 seconds
#   R² Score: 0.812
#   Feature Importances:
#     qualifying_time: 0.850

# 2. Generate predictions for 2025 Bahrain GP
python predict_race.py predict --year 2025 --gp "Bahrain Grand Prix" --upload

# Expected output:
# ✓ Model loaded (MAE: 15.23s)
# ✓ Loaded qualifying data for 20 drivers
# ✓ Generated predictions
#   Predicted winner: VER (5234.56s)
# ✓ Uploaded to database

# 3. Evaluate on 2024 races (backtesting)
python predict_race.py evaluate --year 2024

# Expected output:
# ✓ Evaluated 24 races
#   Season MAE: 16.78s
#   Position Accuracy: 67.3%
#   Podium Accuracy: 71.2%
#   Winner Accuracy: 54.2%
```

## 📊 Frontend Integration

Once predictions are uploaded, they'll automatically appear in the frontend:

```tsx
// The RacePredictions component will fetch and display:
// - Predicted podium with driver photos
// - Full race order table
// - Model metadata (MAE, feature importance)
// - Time gaps between drivers
```

**To view predictions:**
1. Navigate to a 2025 race in the frontend
2. The `RacePredictions` component will auto-fetch from database
3. If no predictions exist, it shows "No predictions available"

## 🎯 Learning Objectives

By implementing this pipeline, you'll master:

1. **Feature Engineering**: Transforming raw F1 data into ML features
2. **Gradient Boosting**: Hyperparameter tuning, ensemble methods
3. **Train/Test Splits**: Temporal vs random splits for time-series
4. **Model Evaluation**: Domain-specific metrics (position accuracy, podium)
5. **Production ML**: Model serialization, versioning, deployment

## 🐛 Common Issues & Solutions

### Issue: "No training data available"
**Solution:** Verify Supabase connection and data exists:
```python
from ml_models.data_loader import F1DataLoader
loader = F1DataLoader()
data = loader.load_historical_races(2018, 2024)
print(f"Merged: {len(data['merged'])} records")
```

### Issue: "Feature extraction not yet implemented"
**Solution:** This is expected! Implement `feature_engineering.py` first.

### Issue: MAE is very high (> 50 seconds)
**Possible causes:**
- Missing data (drivers with NaN qualifying times)
- Feature scaling needed (try StandardScaler)
- Overfitting (reduce max_depth, increase min_samples_split)

### Issue: Predictions all the same
**Solution:** Check that features have variance:
```python
print(features_df['qualifying_time'].describe())
# Should show different values, not all the same
```

## 📚 Resources

- **Scikit-learn Gradient Boosting**: https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting
- **Feature Engineering**: https://scikit-learn.org/stable/modules/preprocessing.html
- **Model Evaluation**: https://scikit-learn.org/stable/modules/model_evaluation.html
- **Inspiration Repo**: https://github.com/mar-antaya/2025_f1_predictions

## 🎉 Success Criteria

Your implementation is complete when:

- ✅ Model trains successfully on historical data
- ✅ MAE < 20 seconds on test set
- ✅ Predictions upload to database
- ✅ Frontend displays predictions correctly
- ✅ You can explain each step in an interview

## 📝 Next Steps

After completing the basic pipeline:

1. **Add more features**: Track history, team averages, weather
2. **Hyperparameter tuning**: Grid search for optimal parameters
3. **Ensemble methods**: Combine multiple models (XGBoost, Random Forest)
4. **Real-time updates**: Fetch qualifying data from FastF1 API
5. **Confidence intervals**: Use quantile regression for uncertainty

---

**Ready to start?** Begin with Task 1: Feature Engineering! 🚀

Open `feature_engineering.py` and look for the `TODO(human)` comments.
