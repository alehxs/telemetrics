import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useTrackDominance } from '../hooks/useTelemetryData';
import { adjustTeamColor } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

interface DominanceData {
  drivers: string[];
  teamColors: string[];
  segments: Array<{
    fastestDriver: string;
    points: Array<[number, number]>;
  }>;
}

const TrackDominance = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: rawData, loading, error } = useTrackDominance(year, grandPrix, session);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // Cast the data to DominanceData type since the API returns it in this format
  const dominanceData = rawData as unknown as DominanceData | null;

  useEffect(() => {
    if (!dominanceData || !canvasRef.current || !dominanceData.drivers) return;

    const { segments, drivers, teamColors } = dominanceData;

    // Ensure colors have # prefix
    const rawTeamColors = teamColors.map((c) => (c.startsWith('#') ? c : `#${c}`));

    // Count drivers per team color
    const teamCount: Record<string, number> = {};
    drivers.forEach((driver, i) => {
      const color = rawTeamColors[i];
      teamCount[color] = (teamCount[color] || 0) + 1;
    });

    // Build driver-specific color map with adjustments for teammates
    const driverColorMap: Record<string, string> = {};
    const teamIndex: Record<string, number> = {};

    drivers.forEach((driver, i) => {
      const color = rawTeamColors[i];
      teamIndex[color] = (teamIndex[color] || 0) + 1;
      const idx = teamIndex[color];

      driverColorMap[driver] =
        teamCount[color] === 1 ? color : idx === 1 ? color : adjustTeamColor(color, 20 * (idx - 1));
    });

    // Create Chart.js datasets
    const datasets = segments
      .filter((seg) => Array.isArray(seg.points))
      .map((seg) => ({
        label: seg.fastestDriver,
        data: seg.points.map(([x, y]) => ({ x, y })),
        borderColor: adjustTeamColor(driverColorMap[seg.fastestDriver], 30), // Boost vibrancy
        borderWidth: 6,
        showLine: true,
        fill: false,
        pointRadius: 0,
        tension: 0.4,
        cubicInterpolationMode: 'monotone' as const,
      }));

    const config = {
      type: 'scatter' as const,
      data: { datasets },
      options: {
        scales: {
          x: { display: false },
          y: { display: false },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: { display: false },
        },
        hover: { mode: null as const },
        animation: false,
        elements: {
          line: {
            borderCapStyle: 'round' as const,
            borderJoinStyle: 'round' as const,
            tension: 0.4,
          },
        },
        responsive: true,
        maintainAspectRatio: true,
      },
    };

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    chartRef.current = new Chart(canvasRef.current, config);

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [dominanceData]);

  if (error) return <div className="text-red-400">Error loading track dominance data</div>;
  if (loading || !dominanceData || !dominanceData.drivers) return <p className="text-gray-400">Loading track dominance...</p>;

  // Check if segments data is available
  if (!dominanceData.segments || dominanceData.segments.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
        <h3 className="text-lg font-bold text-white mb-4">Track Dominance</h3>
        <div className="bg-white rounded-lg p-4 flex items-center justify-center" style={{ minHeight: '300px' }}>
          <p className="text-gray-500 text-center">
            Track dominance data not available for this session.
            <br />
            <span className="text-sm">Telemetry data may not be available for this race.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
      <h3 className="text-lg font-bold text-white mb-4">Track Dominance</h3>
      <div className="bg-white rounded-lg p-4">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{
            maxHeight: '300px',
          }}
        />
      </div>
      <div className="mt-4 flex justify-center gap-6 items-center">
        {dominanceData.drivers.map((driver, i) => {
          const color = dominanceData.teamColors[i].startsWith('#')
            ? dominanceData.teamColors[i]
            : `#${dominanceData.teamColors[i]}`;

          return (
            <div key={driver} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-semibold text-white">{driver}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackDominance;
