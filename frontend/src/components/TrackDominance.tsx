import { useTrackDominance } from '../hooks/useTelemetryData';
import { adjustColorLightness } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const TrackDominance = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: dominanceData, loading, error } = useTrackDominance(year, grandPrix, session);

  if (error) return <div className="text-red-400">Error loading track dominance data</div>;
  if (loading || !dominanceData || !dominanceData.drivers) return <p className="text-gray-400">Loading track dominance...</p>;

  if (!dominanceData.segments || dominanceData.segments.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
        <h3 className="text-lg font-bold text-white mb-4">Track Dominance</h3>
        <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
          <p className="text-gray-500 text-center">
            Track dominance data not available for this session.
            <br />
            <span className="text-sm">Telemetry data may not be available for this race.</span>
          </p>
        </div>
      </div>
    );
  }

  const { segments, drivers, teamColors } = dominanceData;

  const rawTeamColors = teamColors.map((c) => (c.startsWith('#') ? c : `#${c}`));

  const teamCount: Record<string, number> = {};
  drivers.forEach((driver, i) => {
    const color = rawTeamColors[i];
    teamCount[color] = (teamCount[color] || 0) + 1;
  });

  const driverColorMap: Record<string, string> = {};
  const teamIndex: Record<string, number> = {};

  drivers.forEach((driver, i) => {
    const color = rawTeamColors[i];
    teamIndex[color] = (teamIndex[color] || 0) + 1;
    const idx = teamIndex[color];

    driverColorMap[driver] =
      teamCount[color] === 1 ? color : idx === 1 ? color : adjustColorLightness(color, 30);
  });

  const allPoints = segments.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p[0]);
  const ys = allPoints.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const pad = rangeX * 0.05;
  const viewBox = `${minX - pad} ${minY - pad} ${rangeX + 2 * pad} ${rangeY + 2 * pad}`;
  const baseStroke = Math.min(rangeX, rangeY) * 0.022;
  const colorStroke = baseStroke * 0.6;

  const flipY = (y: number) => maxY + minY - y;
  const toPoints = (seg: typeof segments[0]) =>
    seg.points.map(([x, y]) => `${x},${flipY(y)}`).join(' ');

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 flex-1 flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4">Track Dominance</h3>
      <div className="flex-1 min-h-0 flex items-center justify-center">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="w-full max-h-72">
        {segments.map((seg, i) => (
          <polyline
            key={`base-${i}`}
            points={toPoints(seg)}
            stroke="#1a1a2e"
            strokeWidth={baseStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {segments.map((seg, i) => (
          <polyline
            key={`color-${i}`}
            points={toPoints(seg)}
            stroke={driverColorMap[seg.fastestDriver]}
            strokeWidth={colorStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </svg>
      </div>
      <div className="mt-4 flex justify-center gap-6 items-center">
        {drivers.map((driver) => (
          <div key={driver} className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: driverColorMap[driver] }} />
            <span className="text-sm font-semibold text-white">{driver}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackDominance;
