import { usePodium } from '../hooks/useTelemetryData';
import { getTeamLogoPath } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const Podium = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: podiumData } = usePodium(year, grandPrix, session);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
      <h3 className="text-lg font-bold text-white mb-4">Podium</h3>
      <div className="flex justify-center items-stretch gap-3">
        {podiumData.map((driver, index) => (
          <div
            key={index}
            className="flex-1 rounded-lg shadow-lg overflow-hidden backdrop-blur-sm p-3"
            style={{
              backgroundColor: `${driver.TeamColor}CC`,
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white">
                <img
                  src={driver.HeadshotUrl || '/api/placeholder/80/80'}
                  alt={`${driver.Abbreviation}'s headshot`}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-white">P{driver.Position}</div>
                <div className="text-lg font-semibold text-white">{driver.Abbreviation}</div>
              </div>

              <div className="w-16 h-16 flex items-center justify-center">
                <img
                  src={getTeamLogoPath(driver.TeamName)}
                  alt={`${driver.TeamName} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Podium;
