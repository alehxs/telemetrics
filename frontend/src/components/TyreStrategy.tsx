import { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useTyreStrategy, useSessionResults } from '../hooks/useTelemetryData';
import { TYRE_COMPOUND_COLORS, getTyreSvgPath } from '../utils/constants';
import type { TelemetryComponentProps, TyreCompound } from '../types/telemetry';

Chart.register(ChartDataLabels);

interface Stint {
  start: number;
  end: number;
  compound: TyreCompound;
}

const TyreStrategyChart = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const { data: tyreData, loading, error } = useTyreStrategy(year, grandPrix, session);
  const { data: sessionResults } = useSessionResults(year, grandPrix, session);

  const driverOrder = useMemo<string[]>(
    () =>
      sessionResults
        .slice()
        .sort((a, b) => a.Position - b.Position)
        .map((r) => r.Abbreviation),
    [sessionResults]
  );

  const tyreByLap = useMemo<Record<string, Record<number, TyreCompound>>>(() => {
    const grouped: Record<string, Record<number, TyreCompound>> = {};
    tyreData.forEach(({ Driver, Abbreviation, LapNumber, Compound }) => {
      const key = Abbreviation || Driver;
      if (!grouped[key]) grouped[key] = {};
      grouped[key][LapNumber] = Compound;
    });
    return grouped;
  }, [tyreData]);

  // Build chart
  useEffect(() => {
    if (!Object.keys(tyreByLap).length || !canvasRef.current) return;

    // Compute stints per driver
    const driverStints = Object.entries(tyreByLap).reduce<Record<string, Stint[]>>(
      (acc, [driver, laps]) => {
        const stints: Stint[] = [];
        let currentStint: Stint | null = null;

        Object.entries(laps).forEach(([lap, compound]) => {
          const lapNumber = Number(lap);
          if (!currentStint || currentStint.compound !== compound) {
            if (currentStint) stints.push(currentStint);
            currentStint = { start: lapNumber, end: lapNumber, compound };
          } else {
            currentStint.end = lapNumber;
          }
        });

        if (currentStint) stints.push(currentStint);
        acc[driver] = stints;
        return acc;
      },
      {}
    );

    // Prepare driver list
    const drivers = driverOrder.length > 0 ? driverOrder : Object.keys(driverStints);

    // Gather unique compounds
    const compounds = [
      ...new Set(
        Object.values(driverStints).flatMap((stints) => stints.map((s) => s.compound))
      ),
    ];

    // Build datasets (one per compound)
    const datasets = compounds
      .map((compound) => {
        const img = new Image();
        img.src = getTyreSvgPath(compound);

        const data = drivers.map((driver) => {
          const laps = (driverStints[driver] || [])
            .filter((s) => s.compound === compound)
            .reduce((sum, s) => sum + (s.end - s.start + 1), 0);
          return laps;
        });

        return {
          label: compound,
          data,
          backgroundColor: TYRE_COMPOUND_COLORS[compound] || TYRE_COMPOUND_COLORS.UNKNOWN,
          borderWidth: 0,
          pointStyle: img,
          pointRadius: 10,
          barThickness: 14,
          borderRadius: 3,
        };
      })
      .filter((ds) => ds.data.some((v) => v > 0)); // Remove unused compounds

    // Determine total laps
    const allLapNumbers = Object.values(tyreByLap).flatMap((laps) =>
      Object.keys(laps).map((n) => Number(n))
    );
    const totalLaps = Math.max(...allLapNumbers);

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels: drivers, datasets },
      plugins: [ChartDataLabels],
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Laps', color: '#888892' },
            beginAtZero: true,
            max: totalLaps,
            grid: { display: true, color: '#252530' },
            ticks: { stepSize: 1, color: '#888892', maxRotation: 0, minRotation: 0 },
          },
          y: {
            stacked: true,
            title: { display: false },
            ticks: {
              color: '#FFFFFF',
              font: { size: 12, family: "'Formula1 Display'" },
              autoSkip: false,
              maxTicksLimit: drivers.length,
              padding: 6,
            },
            grid: { display: true, color: '#252530' },
          },
        },
        plugins: {
          datalabels: {
            color: '#000000',
            textShadowBlur: 0,
            anchor: 'center',
            align: 'center',
            font: { size: 14, weight: 'bold' },
            formatter: (value: number) => (value > 0 ? value : ''),
          },
          tooltip: {
            padding: 8,
            titleFont: { size: 16 },
            bodyFont: { size: 14 },
            footerFont: { size: 12 },
            callbacks: {
              footer: (items) => {
                const total = items.reduce((sum, i) => sum + (i.parsed.x as number), 0);
                return `Total laps: ${total}`;
              },
            },
          },
          legend: { display: false },
        },
        interaction: { mode: 'index', intersect: false, axis: 'y' },
      },
    });

    // Handle window resize
    const handleResize = () => {
      chartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.destroy();
    };
  }, [tyreByLap, driverOrder]);

  // Dynamic container height - give each driver more space
  const containerHeight = driverOrder.length * 44 + 60;

  if (loading || error || !Object.keys(tyreByLap).length) {
    const message = error
      ? 'Error loading tyre data.'
      : loading
        ? 'Loading tyre data…'
        : 'Tyre strategy data not available for this session.';

    return (
      <div className="bg-gradient-to-b from-[#1E1E26] to-[#15151E] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden border border-[#2A2A35] border-t-white/[0.08]">
        <div className="px-4 py-3">
          <h2 className="text-xs font-semibold text-[#888892] uppercase tracking-[0.12em]">
            Tyre Strategy
          </h2>
        </div>
        <div className="p-4">
          <p className={error ? 'text-red-400' : 'text-[#888892]'}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#1E1E26] to-[#15151E] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden border border-[#2A2A35] border-t-white/[0.08]">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold text-[#888892] uppercase tracking-[0.12em]">
          Tyre Strategy
        </h2>
      </div>
      <div className="px-4 pb-4 pt-1">
        <div className="bg-[#111118] rounded-lg p-2" style={{ height: containerHeight }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default TyreStrategyChart;
