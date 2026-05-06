import type { ReactNode } from 'react';
import { useTrackDominance } from '../hooks/useTelemetryData';
import type { TelemetryComponentProps } from '../types/telemetry';
import { adjustColorLightness } from '../utils/constants';

const CardShell = ({ children }: { children: ReactNode }) => (
  <div className="bg-gradient-to-b from-[#1E1E26] to-[#15151E] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden border border-[#2A2A35] border-t-white/[0.08] flex-1 flex flex-col">
    <div className="px-4 py-3">
      <h2 className="text-xs font-semibold text-[#888892] uppercase tracking-[0.12em]">Track Dominance</h2>
    </div>
    {children}
  </div>
);

const TrackDominance = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: dominanceData, loading, error } = useTrackDominance(year, grandPrix, session);

  if (error || loading || !dominanceData || !dominanceData.drivers) {
    return (
      <CardShell>
        <div className="p-4 flex-1 flex items-center justify-center">
          {error
            ? <p className="text-red-400 text-sm">Error loading track dominance data</p>
            : <p className="text-[#4A4A58] text-sm">Loading...</p>
          }
        </div>
      </CardShell>
    );
  }

  if (!dominanceData.segments || dominanceData.segments.length === 0) {
    return (
      <CardShell>
        <div className="p-4 flex-1 flex items-center justify-center">
          <p className="text-[#4A4A58] text-center text-sm">Telemetry data unavailable for this session.</p>
        </div>
      </CardShell>
    );
  }

  const { segments, drivers, teamColors } = dominanceData;

  const rawTeamColors = teamColors.map((c) => (c.startsWith('#') ? c : `#${c}`));

  const teamCount: Record<string, number> = {};
  drivers.forEach((_, i) => {
    const color = rawTeamColors[i];
    teamCount[color] = (teamCount[color] || 0) + 1;
  });

  const driverColorMap: Record<string, string> = {};
  const teamIndex: Record<string, number> = {};

  drivers.forEach((driver, i) => {
    const color = rawTeamColors[i];
    teamIndex[color] = (teamIndex[color] || 0) + 1;
    driverColorMap[driver] = teamCount[color] > 1 && teamIndex[color] > 1 ? adjustColorLightness(color, 40) : color;
  });

  const allPoints = segments.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p[0]);
  const ys = allPoints.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const pad = rangeX * 0.05;
  const vbW = rangeX + 2 * pad;
  const vbH = rangeY + 2 * pad;
  const viewBox = `${minX - pad} ${minY - pad} ${vbW} ${vbH}`;
  const baseStroke = Math.min(rangeX, rangeY) * 0.022;
  const colorStroke = baseStroke * 0.6;

  const flipY = (y: number) => maxY + minY - y;
  const toPoints = (seg: typeof segments[0]) =>
    seg.points.map(([x, y]) => `${x},${flipY(y)}`).join(' ');

  return (
    <CardShell>
      <div className="p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="w-full max-h-72"
          >
            {segments.map((seg, i) => (
              <polyline
                key={`base-${i}`}
                points={toPoints(seg)}
                stroke="#111118"
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
    </CardShell>
  );
};

export default TrackDominance;
