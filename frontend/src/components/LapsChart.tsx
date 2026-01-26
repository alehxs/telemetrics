import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useLapChartData, useSessionResults } from '../hooks/useTelemetryData';
import type { TelemetryComponentProps } from '../types/telemetry';

Chart.register(zoomPlugin);

interface LapChartEntry {
  driver: string;
  lapNumber: number;
  lapTime: string;
}

interface LapChartPayload {
  laps: LapChartEntry[];
  podium: string[];
}

// Parse "M:SS.mmm" into seconds (float)
function parseTime(timeStr: string): number {
  const [m, rest] = timeStr.split(':');
  const [s, ms] = rest.split('.');
  return parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms.padEnd(3, '0'), 10) / 1000;
}

// Helper to generate random color (fallback)
function randomColor(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

const LapsChart = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const { data: rawLapData } = useLapChartData(year, grandPrix, session);
  const { data: sessionResults } = useSessionResults(year, grandPrix, session);

  const [data, setData] = useState<LapChartPayload | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [teamColors, setTeamColors] = useState<Record<string, string>>({});
  const [driverOrder, setDriverOrder] = useState<string[]>([]);

  // Process fetched data
  useEffect(() => {
    if (!rawLapData) return;

    const lapChartData = rawLapData as unknown as LapChartPayload;

    // Build color map and driver order from session results
    const colorMap: Record<string, string> = {};
    sessionResults.forEach((r) => {
      if (r.TeamColor) {
        colorMap[r.Abbreviation] = r.TeamColor;
      }
    });

    const order = sessionResults
      .slice()
      .sort((a, b) => a.Position - b.Position)
      .map((r) => r.Abbreviation);

    setTeamColors(colorMap);
    setDriverOrder(order);
    setData(lapChartData);
    setSelectedDrivers(lapChartData.podium || order.slice(0, 3));
  }, [rawLapData, sessionResults]);

  // Build/update chart
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const lapData = Array.isArray(data.laps) ? data.laps : [];

    // Don't render chart if no data
    if (lapData.length === 0) return;

    // Vertical hover line plugin
    const verticalLinePlugin = {
      id: 'verticalLine',
      afterDraw: (chart: Chart) => {
        const ctx = chart.ctx;
        const tooltip = chart.tooltip;
        if (tooltip && tooltip.getActiveElements && tooltip.getActiveElements().length > 0) {
          const activeElement = tooltip.getActiveElements()[0];
          const x = activeElement.element.x;
          ctx.save();
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, chart.chartArea.top);
          ctx.lineTo(x, chart.chartArea.bottom);
          ctx.stroke();
          ctx.restore();
        }
      },
    };

    // Compute static y-axis bounds
    const times = lapData.map((l) => parseTime(l.lapTime));
    const yMinVal = Math.min(...times);
    const yMaxVal = Math.max(...times);
    const yRange = yMaxVal - yMinVal;
    const yBuffer = yRange > 0 ? yRange * 0.2 : 1;
    const yMin = yMinVal - yBuffer;
    const yMax = yMaxVal + yBuffer;

    const lapNumbers = lapData.map((l) => l.lapNumber);
    const maxLap = Math.max(...lapNumbers);
    const xMin = 1;
    const xMax = maxLap;

    const usedColors: Record<string, number> = {};
    const datasets = lapData
      .filter((lap) => selectedDrivers.includes(lap.driver))
      .reduce<any[]>((acc, lap) => {
        const driver = lap.driver;
        const color = teamColors[driver] || randomColor();
        usedColors[color] = (usedColors[color] || 0) + 1;
        const dash = usedColors[color] > 1 ? [5, 5] : [];

        let dataset = acc.find((d) => d.label === driver);
        if (!dataset) {
          dataset = {
            label: driver,
            data: [],
            borderColor: color,
            borderDash: dash,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: '#fff',
            tension: 0.2,
            fill: false,
            borderWidth: 1,
          };
          acc.push(dataset);
        }

        dataset.data.push({ x: lap.lapNumber, y: parseTime(lap.lapTime) });
        return acc;
      }, []);

    const config = {
      type: 'line' as const,
      data: { datasets },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear' as const,
            title: { display: true, text: 'Lap Number' },
            min: xMin,
            max: xMax,
            grid: { display: true, color: '#333' },
          },
          y: {
            title: { display: false },
            min: yMin,
            max: yMax,
            grid: { display: true, color: '#333' },
            ticks: {
              callback: (value: string | number) => {
                const numValue = Number(value);
                const m = Math.floor(numValue / 60);
                const s = Math.round(numValue % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
              },
            },
          },
        },
        plugins: {
          datalabels: false,
          legend: { display: false },
          tooltip: {
            enabled: true,
            padding: 10,
            titleFont: { size: 14 },
            bodyFont: { size: 14 },
            boxWidth: 10,
            boxHeight: 10,
            callbacks: {
              label: (ctx: any) => {
                const secs = ctx.parsed.y;
                const minutes = Math.floor(secs / 60);
                const seconds = Math.floor(secs % 60).toString().padStart(2, '0');
                const milliseconds = Math.round((secs - Math.floor(secs)) * 1000)
                  .toString()
                  .padStart(3, '0');
                return `${ctx.dataset.label}: ${minutes}:${seconds}.${milliseconds}`;
              },
            },
          },
          zoom: {
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: false },
              drag: {
                enabled: true,
                borderColor: '#888',
                backgroundColor: 'rgba(136,136,136,0.3)',
              },
              mode: 'x' as const,
              onZoomComplete({ chart }: any) {
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;
                const minX = xScale.min;
                const maxX = xScale.max;
                const visibleYs: number[] = [];

                chart.data.datasets.forEach((ds: any, dsIndex: number) => {
                  if (chart.isDatasetVisible(dsIndex)) {
                    ds.data.forEach((pt: any) => {
                      if (pt.x >= minX && pt.x <= maxX) {
                        visibleYs.push(pt.y);
                      }
                    });
                  }
                });

                if (visibleYs.length) {
                  const visMin = Math.min(...visibleYs);
                  const visMax = Math.max(...visibleYs);
                  const visRange = visMax - visMin;
                  const visBuffer = visRange > 0 ? visRange * 0.2 : 1;
                  const newMin = visMin - visBuffer;
                  const newMax = visMax + visBuffer;

                  yScale.options.min = newMin;
                  yScale.options.max = newMax;

                  yScale.options.ticks.callback = (value: string | number) => {
                    const numValue = Number(value);
                    const minutes = Math.floor(numValue / 60);
                    const seconds = Math.floor(numValue % 60).toString().padStart(2, '0');
                    const ms = Math.round((numValue - Math.floor(numValue)) * 1000)
                      .toString()
                      .padStart(3, '0');
                    return `${minutes}:${seconds}.${ms}`;
                  };

                  chart.update();
                }
              },
            },
            pan: {
              enabled: false,
              mode: 'x' as const,
            },
          },
        },
        interaction: { mode: 'index' as const, intersect: false },
      },
      plugins: [verticalLinePlugin],
    };

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, selectedDrivers, teamColors]);

  const toggleDriver = (driver: string) => {
    setSelectedDrivers((selected) =>
      selected.includes(driver) ? selected.filter((d) => d !== driver) : [...selected, driver]
    );
  };

  const resetAll = () => {
    if (!driverOrder || driverOrder.length === 0) return;
    setSelectedDrivers(driverOrder.slice(0, 3));
  };

  const lapData = data && Array.isArray(data.laps) ? data.laps : [];

  // Check if we have any lap data
  if (!data || lapData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Lap Times Chart</h3>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-center" style={{ height: 400 }}>
          <p className="text-gray-400 text-center">
            Lap times data not available for this session.
            <br />
            <span className="text-sm text-gray-500">Lap data may not be available for this race.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Lap Times Chart</h3>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={resetAll}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded cursor-pointer transition-colors text-sm"
        >
          Reset
        </button>
      </div>
      <div className="bg-gray-900 rounded-lg p-4" style={{ height: 400 }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {data &&
          driverOrder
            .filter((drv) => lapData.some((l) => l.driver === drv))
            .map((drv) => {
              const isSelected = selectedDrivers.includes(drv);
              return (
                <button
                  key={drv}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleDriver(drv)}
                  className="px-3 py-1 rounded cursor-pointer transition-all text-sm font-semibold"
                  style={{
                    backgroundColor: isSelected ? teamColors[drv] : '#374151',
                    color: isSelected ? '#fff' : teamColors[drv] || '#fff',
                    border: isSelected ? `2px solid ${teamColors[drv]}` : '2px solid transparent',
                  }}
                >
                  {drv}
                </button>
              );
            })}
      </div>
    </div>
  );
};

export default LapsChart;
