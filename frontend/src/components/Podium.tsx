import { usePodium } from '../hooks/useTelemetryData';
import { getTeamLogoPath, getDriverHeadshotPath } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const Podium = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: podiumData } = usePodium(year, grandPrix, session);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
      <div className="flex gap-4">
        {podiumData.map((driver, index) => (
          <div
            key={index}
            className="relative flex-1 rounded-2xl shadow-lg overflow-hidden h-48"
            style={{
              backgroundColor: driver.TeamColor,
            }}
          >
            {/* Team logo in background */}
            <div className="absolute top-2 right-2 w-20 h-20">
              <img
                src={getTeamLogoPath(driver.TeamName)}
                alt={`${driver.TeamName} logo`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Driver photo on left */}
            <div className="absolute left-0 top-0 h-full w-32">
              <img
                src={getDriverHeadshotPath(driver.Abbreviation)}
                alt={`${driver.Abbreviation}'s photo`}
                className="h-full w-full object-cover object-top"
              />
            </div>

            {/* Floating glass info pill */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-black/30 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between text-white">
                  {/* Driver abbreviation */}
                  <div className="text-2xl font-bold drop-shadow-lg">
                    {driver.Abbreviation}
                  </div>

                  {/* Position */}
                  <div className="text-2xl font-bold drop-shadow-lg">
                    P{driver.Position}
                  </div>

                  {/* Status/Time */}
                  <div className="text-sm font-semibold opacity-90 drop-shadow">
                    {driver.Status || driver.Time}
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

export default Podium;
