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

export default function TyreStrategyChart({ year, grandPrix, session }) {
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
        .eq('grand_prix', grandPrix)
        .eq('session', session)
        .eq('data_type', 'tyres')
        .maybeSingle();
      // ignore "no rows" errors and treat as empty
      if (tyreError && tyreError.code !== 'PGRST116') throw tyreError;
      const entries = tyreRow?.payload || [];

      // load finishing order for drivers
      const { data: resRow, error: resError } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', year)
        .eq('grand_prix', grandPrix)
        .eq('session', session)
        .eq('data_type', 'session_results')
        .maybeSingle();
      // ignore "no rows" errors and treat as empty result set
      if (resError && resError.code !== 'PGRST116') throw resError;
      const finishArr = Array.isArray(resRow?.payload) ? resRow.payload : [];

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
  }, [year, grandPrix, session]);

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

    // 3) prepare datasets: one per compound
    const drivers = driverOrder.length ? driverOrder : Object.keys(driverStints);
    // gather unique compounds used
    const compounds = [
      ...new Set(
        Object.values(driverStints)
          .flatMap(stints => stints.map(s => s.compound))
      )
    ];
    // build one dataset per compound, omit compounds never used
    const datasets = compounds
      .map(compound => {
        const img = new Image();
        img.src = `/svgs/${compound.toLowerCase()}tyre.svg`;
        const data = drivers.map(drv => {
          const laps = (driverStints[drv] || [])
            .filter(s => s.compound === compound)
            .reduce((sum, s) => sum + (s.end - s.start + 1), 0);
          return laps;
        });
        return {
          label: compound,
          data,
          backgroundColor: compoundColors[compound] || compoundColors.UNKNOWN,
          borderWidth: 0,
          pointStyle: img,
          pointRadius: 10,
          barThickness: 20,
          borderRadius: 3,
        };
      })
      .filter(ds => ds.data.some(v => v > 0)); // remove unused compounds

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
            ticks: {
              color: '#fff',
              font: { size: 18 },
              autoSkip: false,
              maxTicksLimit: drivers.length,
            },
            grid: { display: true, color: '#333' }
          }
        },
        plugins: {
          datalabels: {
            color: '#000',
            anchor: 'center',
            align: 'center',
            font: { size: 14, weight: 'bold' },
            formatter: value => value > 0 ? value : ''
          },
          tooltip: {
            padding: 8,
            titleFont: { size: 16 },
            bodyFont: { size: 14 },
            footerFont: { size: 12 },
            callbacks: {
              footer: items => {
                const total = items.reduce((sum, i) => sum + i.parsed.x, 0);
                return `Total laps: ${total}`;
              }
            }
          },
          legend: { display: false }
        },
        interaction: { mode: 'index', intersect: false, axis: 'y' }
      }
    });

    // handle window resize
    const handleResize = () => {
      chartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // destroy old chart and cleanup listener on unmount or deps change
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.destroy();
    };
  }, [tyreByLap, driverOrder]);

  // dynamic container height based on driver count
  const containerHeight = driverOrder.length * 35 + 100;

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
      height: containerHeight,
      margin: '0 auto'
    }}>
      <h3 style={{ color: '#fff', marginBottom: 12 }}>Tyre Strategy by Lap</h3>
      <canvas ref={canvasRef} />
    </div>
  );
}