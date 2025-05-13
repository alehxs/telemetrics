// src/components/TyreStrategyChart.jsx
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
Chart.register(ChartDataLabels);

const compoundColors = {
  SOFT: '#FF1E1E',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#00C16E',
  WET: '#007BFF',
  UNKNOWN: '#999999'
};

export default function TyreStrategyChart({ year, grand_prix, session }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [tyreByLap, setTyreByLap] = useState({});
  const [driverOrder, setDriverOrder] = useState([]);

  // fetch & group
  useEffect(() => {
    async function fetchData() {
      // load tyre data
      const { data: tyreRow, error: tyreError } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', year)
        .eq('grand_prix', grand_prix)
        .eq('session', session)
        .eq('data_type', 'tyres')
        .single();
      if (tyreError) throw tyreError;
      const entries = tyreRow.payload || [];

      // load finishing order for drivers
      const { data: resRow, error: resError } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', year)
        .eq('grand_prix', grand_prix)
        .eq('session', session)
        .eq('data_type', 'session_results')
        .single();
      if (resError) throw resError;
      const finishArr = Array.isArray(resRow.payload) ? resRow.payload : [];

      // sort by Position and map to abbreviations
      const order = finishArr
        .slice()
        .sort((a, b) => a.Position - b.Position)
        .map(r => r.Abbreviation);
      setDriverOrder(order);

      const grouped = {};
      entries.forEach(({ Driver, Abbreviation, LapNumber, Compound }) => {
        const key = Abbreviation || Driver;
        if (!grouped[key]) grouped[key] = {};
        grouped[key][LapNumber] = Compound;
      });
      setTyreByLap(grouped);
    }
    fetchData();
  }, [year, grand_prix, session]);

  // build chart
  useEffect(() => {
    if (!Object.keys(tyreByLap).length) return;

    // 1) compute stints per driver
    const driverStints = Object.entries(tyreByLap).reduce((acc, [driver, laps]) => {
      const stints = [];
      let cur = null;
      Object.entries(laps).forEach(([lap, cmp]) => {
        const n = +lap;
        if (!cur || cur.compound !== cmp) {
          if (cur) stints.push(cur);
          cur = { start: n, end: n, compound: cmp };
        } else {
          cur.end = n;
        }
      });
      if (cur) stints.push(cur);
      acc[driver] = stints;
      return acc;
    }, {});

    // 2) find max number of stints any driver has
    const maxStints = Math.max(...Object.values(driverStints).map(s => s.length));

    // 3) prepare datasets: one per stint‑index
    const drivers = driverOrder.length ? driverOrder : Object.keys(driverStints);
    const datasets = Array.from({ length: maxStints }, (_, stintIdx) => {
      // for this stintIdx, build a data array and color array
      const data    = [];
      const bgColor = [];
      drivers.forEach(drv => {
        const stint = driverStints[drv] ? driverStints[drv][stintIdx] : null;
        if (stint) {
          const len = stint.end - stint.start + 1;
          data.push(len);
          bgColor.push(compoundColors[stint.compound] || compoundColors.UNKNOWN);
        } else {
          data.push(0);
          bgColor.push('rgba(0,0,0,0)');  // invisible
        }
      });
      return {
        label: `Stint ${stintIdx+1}`,
        data,
        backgroundColor: bgColor,
        borderWidth: 0
      };
    });

    // determine the race’s total laps
    const allLapNumbers = Object.values(tyreByLap)
      .flatMap(laps => Object.keys(laps).map(n => Number(n)));
    const totalLaps = Math.max(...allLapNumbers);

    // destroy old chart
    if (chartRef.current) chartRef.current.destroy();

    // create new
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
            ticks: { stepSize: 1, color: '#ccc' }
          },
          y: {
            stacked: true,
            title: { display: false },
            ticks: { color: '#fff', font: { size: 14 } },
            grid: { display: true, color: '#333' }
          }
        },
        plugins: {
          datalabels: {
            color: '#fff',
            anchor: 'center',
            align: 'center',
            font: { size: 12 },
            formatter: value => value > 0 ? value : ''
          },
          tooltip: {
            callbacks: {
              footer: items => {
                const total = items.reduce((sum, i) => sum + i.parsed.x, 0);
                const sets  = items.filter(i => i.parsed.x > 0).length;
                return [`Total laps: ${total}`, `Stints: ${sets}`];
              }
            },
            displayFooter: true
          },
          legend: { display: false }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }, [tyreByLap, driverOrder]);

  // empty state
  if (!Object.keys(tyreByLap).length) {
    return <p style={{ color: '#fff' }}>Loading tyre data…</p>;
  }

  return (
    <div style={{
      background: '#111',
      padding: 20,
      borderRadius: 8,
      width: '100%',
      height: 500,
      margin: '0 auto'
    }}>
      <h3 style={{ color: '#fff', marginBottom: 12 }}>Tyre Strategy by Lap</h3>
      <canvas ref={canvasRef} />
    </div>
  );
}