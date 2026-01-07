import { useSessionInfo } from '../hooks/useTelemetryData';
import { formatEventDate } from '../utils/formatters';
import { getCountryFlag } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const SessionInfo = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: sessionData } = useSessionInfo(year, grandPrix, session);

  if (!sessionData) {
    return null;
  }

  const {
    Country = 'Unknown',
    Location = 'Unknown',
    EventName = 'Unknown Event',
    EventDate = 'Unknown Date',
    OfficialEventName = 'Unknown',
    TotalLaps = 'Unknown',
  } = sessionData;

  const formattedDate = formatEventDate(EventDate);
  const countryFlag = getCountryFlag(Country);

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{OfficialEventName}</h2>
            <div className="flex items-center gap-4 text-gray-300 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-xl">{countryFlag}</span>
                <span>{Location}, {Country}</span>
              </span>
              <span className="text-gray-500">|</span>
              <span>{formattedDate}</span>
              <span className="text-gray-500">|</span>
              <span className="font-semibold text-red-400">{TotalLaps} Laps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;
