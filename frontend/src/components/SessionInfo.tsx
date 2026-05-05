import ReactCountryFlag from 'react-country-flag';
import { useSessionInfo } from '../hooks/useTelemetryData';
import { formatEventDate } from '../utils/formatters';
import { getCountryCode } from '../utils/constants';
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
  const countryCode = getCountryCode(Country);

  return (
    <div className="bg-gradient-to-r from-[#1C1F36] to-[#151829] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#2A2D45] border-l-4 border-l-[#E10600] overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{OfficialEventName}</h2>
            <div className="flex items-center gap-4 text-[#8B92B8] text-sm">
              <span className="flex items-center gap-2">
                {countryCode && <ReactCountryFlag countryCode={countryCode} svg style={{ width: '1.5em', height: '1.5em' }} />}
                <span>{Location}, {Country}</span>
              </span>
              <span className="text-[#4A5080]">|</span>
              <span>{formattedDate}</span>
              <span className="text-[#4A5080]">|</span>
              <span className="font-semibold text-red-400">{TotalLaps} Laps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;
