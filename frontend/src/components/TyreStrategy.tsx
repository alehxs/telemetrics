import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useTyreStrategy, useSessionResults } from '../hooks/useTelemetryData';
import { TYRE_COMPOUND_COLORS, getTyreSvgPath } from '../utils/constants';
import type { TelemetryComponentProps, TyreCompound } from '../types/telemetry';

Chart.register(ChartDataLabels);

interface TyreLapData {
  Driver: string;
  Abbreviation?: string;
  LapNumber: number;
  Compound: TyreCompound;
}

interface Stint {
  start: number;
  end: number;
  compound: TyreCompound;
}

const TyreStrategyChart = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const { data: tyreData } = useTyreStrategy(year, grandPrix, session);
  const { data: sessionResults } = useSessionResults(year, grandPrix, session);

  const [tyreByLap, setTyreByLap] = useState<Record<string, Record<number, TyreCompound>>>({});
  const [driverOrder, setDriverOrder] = useState<string[]>([]);

  // Process fetched data
  useEffect(() => {
    // Get driver finishing order
    const order = sessionResults
      .slice()
      .sort((a, b) => a.Position - b.Position)
      .map((r) => r.Abbreviation);
    setDriverOrder(order);

    // Group tyre data by driver and lap
    const grouped: Record<string, Record<number, TyreCompound>> = {};
    (tyreData as unknown as TyreLapData[]).forEach(({ Driver, Abbreviation, LapNumber, Compound }) => {
      const key = Abbreviation || Driver;
      if (!grouped[key]) grouped[key] = {};
      grouped[key][LapNumber] = Compound;
    });
    setTyreByLap(grouped);
  }, [tyreData, sessionResults]);

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
          barThickness: 20,
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
            title: { display: true, text: 'Laps' },
            beginAtZero: true,
            max: totalLaps,
            grid: { display: true, color: '#333' },
            ticks: { stepSize: 1, color: '#ccc' },
          },
          y: {
            stacked: true,
            title: { display: false },
            ticks: {
              color: '#fff',
              font: { size: 18 },
              autoSkip: false,
              maxTicksLimit: drivers.length,
            },
            grid: { display: true, color: '#333' },
          },
        },
        plugins: {
          datalabels: {
            color: '#000',
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
  const containerHeight = driverOrder.length * 50 + 150;

  if (!Object.keys(tyreByLap).length) {
    return <p style={{ color: '#fff' }}>Loading tyre data…</p>;
  }

  return (
    <div
      style={{
        background: '#111',
        padding: 20,
        borderRadius: 8,
        width: '100%',
        margin: '0 auto',
      }}
    >
      <h3 style={{ color: '#fff', marginBottom: 12 }}>Tyre Strategy by Lap</h3>
      <div style={{ height: containerHeight }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default TyreStrategyChart;
