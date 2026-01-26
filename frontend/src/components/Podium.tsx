import { usePodium } from '../hooks/useTelemetryData';
import { getTeamLogoPath, getDriverHeadshotPath } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const Podium = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: podiumData } = usePodium(year, grandPrix, session);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2 md:p-4">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {podiumData.map((driver, index) => (
          <div
            key={index}
            className="relative md:flex-1 rounded-2xl md:rounded-xl shadow-lg overflow-hidden h-56 md:h-48"
            style={{
              backgroundColor: driver.TeamColor,
            }}
          >
            {/* Team logo - larger on mobile, positioned right */}
            <div className="absolute top-4 right-4 md:top-2 md:right-2 w-32 h-32 md:w-20 md:h-20 opacity-60 md:opacity-100">
              <img
                src={getTeamLogoPath(driver.TeamName)}
                alt={`${driver.TeamName} logo`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Driver photo - full height on mobile, left-aligned */}
            <div className="absolute left-0 top-0 h-full w-48 md:w-32">
              <img
                src={getDriverHeadshotPath(driver.Abbreviation)}
                alt={`${driver.Abbreviation}'s photo`}
                className="h-full w-full object-cover object-top"
              />
            </div>

            {/* Info bar at bottom - full width on mobile */}
            <div className="absolute bottom-0 left-0 right-0 md:bottom-3 md:left-3 md:right-3">
              <div className="bg-black/40 backdrop-blur-xl md:rounded-full px-6 py-4 md:px-6 md:py-3 border-t md:border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between text-white">
                  {/* Driver abbreviation */}
                  <div className="text-2xl md:text-xl font-bold drop-shadow-lg">
                    {driver.Abbreviation}
                  </div>

                  {/* Position */}
                  <div className="text-2xl md:text-xl font-bold drop-shadow-lg">
                    P{driver.Position}
                  </div>

                  {/* Status/Time */}
                  <div className="text-base md:text-sm font-semibold opacity-90 drop-shadow">
                    {driver.Position === 1
                      ? 'Leader'
                      : driver.Status === 'Finished'
                        ? driver.Time
                        : driver.Status}
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
