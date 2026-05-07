import { useLatestPrediction } from '../hooks/useTelemetryData';
import { getTeamLogoPath, getDriverHeadshotPath } from '../utils/constants';

function formatProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const PredictionPodium = () => {
  const { data, loading, error } = useLatestPrediction();

  if (loading || error || !data || data.drivers.length === 0) return null;

  const sorted = [...data.drivers].sort((a, b) => a.PredictedPosition - b.PredictedPosition);

  return (
    <div className="bg-gradient-to-b from-[#1E1E26] to-[#15151E] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#2A2A35] border-t-white/[0.08] p-2 md:p-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xs font-semibold tracking-widest text-[#888892] uppercase">
          AI Prediction
        </span>
        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ML
        </span>
        <span className="text-xs text-[#4A4A58] ml-1">
          {data.grandPrix} · {data.session}
        </span>
      </div>
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {sorted.map((driver) => (
          <div
            key={driver.Abbreviation}
            className="relative md:flex-1 rounded-2xl md:rounded-xl shadow-lg overflow-hidden h-56 md:h-48"
            style={{ backgroundColor: driver.TeamColor }}
          >
            <div className="absolute top-4 right-4 md:top-2 md:right-2 w-32 h-32 md:w-20 md:h-20 opacity-60 md:opacity-100">
              <img
                src={getTeamLogoPath(driver.TeamName)}
                alt={`${driver.TeamName} logo`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="absolute left-0 top-0 h-full w-48 md:w-32">
              <img
                src={getDriverHeadshotPath(driver.Abbreviation)}
                alt={`${driver.Abbreviation}'s photo`}
                className="h-full w-full object-cover object-top"
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 md:bottom-3 md:left-3 md:right-3">
              <div className="bg-black/40 backdrop-blur-xl md:rounded-full px-6 py-4 md:px-6 md:py-3 border-t md:border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between text-white">
                  <div className="text-2xl md:text-xl font-bold drop-shadow-lg">
                    {driver.Abbreviation}
                  </div>
                  <div className="text-2xl md:text-xl font-bold drop-shadow-lg">
                    P{driver.PredictedPosition}
                  </div>
                  <div className="text-base md:text-sm font-semibold opacity-90 drop-shadow">
                    {formatProbability(driver.PodiumProbability)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionPodium;
