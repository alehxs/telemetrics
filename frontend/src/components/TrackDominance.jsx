// adjust a hex color by a percentage amount (positive to lighten, negative to darken)
function adjustHexColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;
  r = Math.min(255, Math.max(0, r + Math.round(r * percent / 100)));
  g = Math.min(255, Math.max(0, g + Math.round(g * percent / 100)));
  b = Math.min(255, Math.max(0, b + Math.round(b * percent / 100)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
const API_BASE_URL = import.meta.env.VITE_API_URL;


const TrackDominance = ({ year, grandPrix, session }) => {
  const [dominanceData, setDominanceData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrackDominance = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/track_dominance/?year=${year}` +
          `&grand_prix=${encodeURIComponent(grandPrix)}` +
          `&session=${encodeURIComponent(session)}`
        );
        if (!res.ok) throw new Error("Failed to fetch track dominance data");
        const json = await res.json();
        setDominanceData(json);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchTrackDominance();
  }, [year, grandPrix, session]);

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!dominanceData) return;
    const { segments } = dominanceData;

    // assign distinct colors for each driver, even on the same team
    const driverIds = dominanceData.drivers;
    const rawTeamColors = dominanceData.teamColors.map(c =>
      c.startsWith('#') ? c : `#${c}`
    );
    // count number of drivers per team color
    const teamCount = {};
    driverIds.forEach((driver, i) => {
      const color = rawTeamColors[i];
      teamCount[color] = (teamCount[color] || 0) + 1;
    });
    // build driver-specific color map
    const driverColorMap = {};
    const teamIndex = {};
    driverIds.forEach((driver, i) => {
      const color = rawTeamColors[i];
      teamIndex[color] = (teamIndex[color] || 0) + 1;
      const idx = teamIndex[color];
      driverColorMap[driver] = teamCount[color] === 1
        ? color
        : (idx === 1 ? color : adjustHexColor(color, 20 * (idx - 1)));
    });
    // create datasets using driver-specific colors
    const datasets = segments
      .filter(seg => Array.isArray(seg.points))
      .map(seg => ({
        label: seg.fastestDriver,
        data: seg.points.map(([x, y]) => ({ x, y })),
        borderColor: driverColorMap[seg.fastestDriver],
        borderWidth: 6,
        showLine: true,
        fill: false,
        pointRadius: 0,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
      }));
    // boost vibrancy: lighten each line for neon pop
    datasets.forEach(ds => {
      ds.borderColor = adjustHexColor(ds.borderColor, 30);
    });

    const cfg = {
      type: "scatter",
      data: { datasets },
      options: {
        scales: {
          x: { display: false },
          y: { display: false }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: { display: false }
        },
        hover: { mode: null },
        animation: false,
        elements: {
          line: {
            borderCapStyle: "round",
            borderJoinStyle: "round",
            tension: 0.4
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    };

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, cfg);
  }, [dominanceData]);

  if (error) return <div>Error: {error}</div>;
  if (!dominanceData) return <p>Loading track dominance...</p>;

  return (
    <div className="track-dominance-container">
      <canvas
        ref={canvasRef}
        className="track-dominance-chart"
        style={{
          filter: 'saturate(200%) drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 16px rgba(255,255,255,0.6))'
        }}
      />
      <div className="mt-0 flex justify-center space-x-8 items-center">
        {dominanceData.drivers.map((driver, i) => (
          <div key={driver} className="flex items-center space-x-2">
            <span
              className="w-6 h-6 rounded-full"
              style={{
                backgroundColor: dominanceData.teamColors[i].startsWith('#')
                  ? dominanceData.teamColors[i]
                  : `#${dominanceData.teamColors[i]}`
              }}
            />
            <span className="text-base font-semibold text-gray-900">{driver}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackDominance;