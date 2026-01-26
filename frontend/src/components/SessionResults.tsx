import { useSessionResults } from '../hooks/useTelemetryData';
import { formatLeaderTime, formatIntervalTime, getDisplayTime } from '../utils/formatters';
import { getTeamLogoPath } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const SessionResults = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: results } = useSessionResults(year, grandPrix, session);

  const leaderTime = results[0]?.Time || null;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden h-fit">
      <div className="bg-red-600 px-4 py-3">
        <h2 className="text-lg font-bold text-white">Session Results</h2>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        <table className="table-auto w-full border-collapse">
          <thead className="sticky top-0 bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">POS</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">DRIVER</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-300">TIME</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {results.map((driver, index) => (
              <tr
                key={index}
                className={
                  index % 2 === 0 ? 'bg-gray-900/60' : 'bg-gray-800/40'
                }
              >
                <td className="px-3 py-2 text-left font-bold text-sm">
                  {driver.Position || 'N/A'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {driver.TeamName && (
                      <img
                        src={getTeamLogoPath(driver.TeamName)}
                        alt={driver.TeamName}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span className="text-sm">{driver.Abbreviation}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold">
                  {getDisplayTime(driver, leaderTime, index === 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionResults;
