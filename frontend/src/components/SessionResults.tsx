import { useSessionResults } from '../hooks/useTelemetryData';
import { getDisplayTime } from '../utils/formatters';
import { getTeamLogoPath } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const SessionResults = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: results } = useSessionResults(year, grandPrix, session);

  const leaderTime = results[0]?.Time || null;

  return (
    <div className="bg-gradient-to-b from-[#1C1F38] to-[#14172A] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col flex-1 min-h-0 border border-[#2A2D45] border-t-white/[0.08]">
      <div className="px-4 py-3 shrink-0">
        <h2 className="text-xs font-semibold text-[#8B92B8] uppercase tracking-[0.12em]">Session Results</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="table-auto w-full border-collapse">
          <thead className="sticky top-0 bg-[#1C1F36]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#8B92B8]">POS</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#8B92B8]">DRIVER</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-[#8B92B8]">TIME</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {results.map((driver, index) => (
              <tr
                key={driver.Abbreviation}
                className={index % 2 === 0 ? 'bg-[#1C1F36]/60' : 'bg-[#14172A]/40'}
                style={
                  index === 0
                    ? { backgroundColor: 'rgba(225,6,0,0.06)', borderLeft: '3px solid #E10600' }
                    : driver.TeamColor
                      ? { borderLeft: `3px solid ${driver.TeamColor}` }
                      : undefined
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
                        className="w-6 h-4 object-contain"
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
