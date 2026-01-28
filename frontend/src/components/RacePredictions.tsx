/**
 * Race Predictions Component
 *
 * Displays ML-generated race predictions including predicted podium,
 * full race order, and model metadata (MAE, feature importance).
 */

import { useState, useEffect } from 'react';
import {
  getRacePredictions,
  simplifyPredictions,
  formatRaceTime,
  formatTimeGap,
} from '../services/predictionsService';
import type {
  RacePrediction,
  SimplePrediction,
} from '../types/predictions';
import { getDriverHeadshotPath, getTeamLogoPath } from '../utils/constants';

interface RacePredictionsProps {
  year: number;
  grandPrix: string;
  session?: string;
}

const RacePredictions = ({
  year,
  grandPrix,
  session = 'Race',
}: RacePredictionsProps) => {
  const [prediction, setPrediction] = useState<RacePrediction | null>(null);
  const [simplePredictions, setSimplePredictions] = useState<SimplePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await getRacePredictions(year, grandPrix, session);

        if (error) {
          setError('Failed to load predictions');
          console.error('Prediction fetch error:', error);
          return;
        }

        if (!data) {
          setError('No predictions available for this race');
          return;
        }

        setPrediction(data);
        setSimplePredictions(simplifyPredictions(data));
      } catch (err) {
        setError('Unexpected error loading predictions');
        console.error('Prediction error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [year, grandPrix, session]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
        <div className="flex items-center justify-center h-40">
          <div className="text-gray-400">Loading predictions...</div>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <svg
            className="w-12 h-12 mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-center">{error || 'No predictions available'}</p>
          <p className="text-sm text-gray-500 mt-2">
            Predictions will appear after qualifying and model training
          </p>
        </div>
      </div>
    );
  }

  const podium = prediction.predictions.podium || [];
  const metadata = prediction.predictions.model_metadata;
  const leaderTime = simplePredictions[0]?.predictedTime || 0;

  return (
    <div className="space-y-4">
      {/* Header with Model Info */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              AI Race Predictions
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Powered by Gradient Boosting ML Model
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Model: {metadata.version}</div>
            {metadata.mae && (
              <div className="text-sm text-gray-400">
                MAE: {metadata.mae.toFixed(1)}s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Predicted Podium */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
        <h4 className="text-md font-semibold text-white mb-3">Predicted Podium</h4>
        <div className="flex flex-col md:flex-row gap-3">
          {podium.slice(0, 3).map((driverAbbr, index) => {
            const driverPred = prediction.predictions.predictions.find(
              (p) => p.driver_abbr === driverAbbr
            );
            if (!driverPred) return null;

            return (
              <div
                key={index}
                className="relative flex-1 rounded-xl shadow-lg overflow-hidden h-40 bg-gradient-to-br from-gray-700 to-gray-800"
              >
                {/* Position Badge */}
                <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                  {index + 1}
                </div>

                {/* Driver Photo */}
                <div className="absolute left-0 top-0 h-full w-32 opacity-70">
                  <img
                    src={getDriverHeadshotPath(driverPred.driver_abbr)}
                    alt={driverPred.driver_name}
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                {/* Driver Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-4 py-3">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <div className="text-lg font-bold">
                        {driverPred.driver_abbr}
                      </div>
                      <div className="text-xs text-gray-300">
                        {driverPred.team}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-300">
                      <div>Q: P{driverPred.qualifying_position}</div>
                      <div>{formatRaceTime(driverPred.predicted_race_time_seconds)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Predictions Table */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-md font-semibold text-white">
            Full Race Prediction
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr className="text-left text-sm text-gray-400">
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">Predicted Time</th>
                <th className="px-4 py-3 text-right">Gap</th>
                <th className="px-4 py-3 text-center">Qual Pos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {prediction.predictions.predictions.map((pred) => (
                <tr
                  key={pred.position}
                  className="text-sm text-white hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold">{pred.position}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={getDriverHeadshotPath(pred.driver_abbr)}
                        alt={pred.driver_abbr}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{pred.driver_abbr}</div>
                        <div className="text-xs text-gray-400">
                          {pred.driver_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="flex items-center gap-2">
                      <img
                        src={getTeamLogoPath(pred.team)}
                        alt={pred.team}
                        className="w-6 h-6 object-contain"
                      />
                      {pred.team}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatRaceTime(pred.predicted_race_time_seconds)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">
                    {pred.position === 1
                      ? '---'
                      : formatTimeGap(pred.predicted_race_time_seconds - leaderTime)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                        pred.qualifying_position <= 3
                          ? 'bg-green-500/20 text-green-400'
                          : pred.qualifying_position <= 10
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {pred.qualifying_position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Metadata */}
      {metadata.feature_importance && (
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
          <h4 className="text-md font-semibold text-white mb-3">
            Feature Importance
          </h4>
          <div className="space-y-2">
            {Object.entries(metadata.feature_importance)
              .sort(([, a], [, b]) => b - a)
              .map(([feature, importance]) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="text-sm text-gray-400 w-32 capitalize">
                    {feature.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${importance * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-400 w-12 text-right">
                    {(importance * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RacePredictions;
