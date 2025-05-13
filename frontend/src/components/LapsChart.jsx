import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// parse "M:SS.mmm" into seconds (float)
function parseTime(t) {
  const [m, rest] = t.split(':');
  const [s, ms] = rest.split('.');
  return parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms.padEnd(3, '0'), 10) / 1000;
}


const LapsChart = ({ year, grandPrix, session = 'Race' }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [data, setData] = useState(null);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [teamColors, setTeamColors] = useState({});
  const [driverOrder, setDriverOrder] = useState([]);

  useEffect(() => {
    if (!year || !grandPrix) return;
    const fetchData = async () => {
      // load lap data
      const { data: lapRow, error: lapError } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', year)
        .eq('grand_prix', grandPrix)
        .eq('session', session)
        .eq('data_type', 'lap_chart_data')
        .single();
      if (lapError) throw lapError;
      const lapJson = lapRow.payload || { laps: [], podium: [] };

      // load session results for team colors & finishing order
      const { data: sessRow, error: sessError } = await supabase
        .from('telemetry_data')
        .select('payload')
        .eq('year', year)
        .eq('grand_prix', grandPrix)
        .eq('session', session)
        .eq('data_type', 'session_results')
        .single();
      if (sessError) throw sessError;
      const sessJson = Array.isArray(sessRow.payload) ? sessRow.payload : [];
      // build color map and order
      const colorMap = {};
      sessJson.forEach(r => {
        colorMap[r.Abbreviation] = r.TeamColor;
      });
      const order = sessJson
        .slice()
        .sort((a, b) => a.Position - b.Position)
        .map(r => r.Abbreviation);
      setTeamColors(colorMap);
      setDriverOrder(order);
      // set lap data
      setData(lapJson);
      setSelectedDrivers(lapJson.podium);
    };
    fetchData();
  }, [year, grandPrix, session]);

  // build / update chart
  useEffect(() => {
    if (!data) return;

    // vertical hover line plugin
    const verticalLinePlugin = {
      id: 'verticalLine',
      afterDraw: chart => {
        const ctx = chart.ctx;
        const tooltip = chart.tooltip;
        if (tooltip._active && tooltip._active.length) {
          const x = tooltip._active[0].element.x;
          ctx.save();
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, chart.chartArea.top);
          ctx.lineTo(x, chart.chartArea.bottom);
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    const lapData = Array.isArray(data.laps) ? data.laps : [];
    // compute static y-axis bounds based on all lap times
    const times = lapData.map(l => parseTime(l.lapTime));
    const yMinVal = Math.min(...times);
    const yMaxVal = Math.max(...times);
    const yRange = yMaxVal - yMinVal;
    const yBuffer = yRange > 0 ? yRange * 0.2 : 1;
    const yMin = yMinVal - yBuffer;
    const yMax = yMaxVal + yBuffer;

    const lapNumbers = lapData.map(l => l.lapNumber);
    const maxLap = Math.max(...lapNumbers);
    const xMin = 1;
    const xMax = maxLap;

    const usedColors = {};
    const datasets = lapData
      .filter(lap => selectedDrivers.includes(lap.driver))
      .reduce((acc, lap) => {
        const drv = lap.driver;
        const color = teamColors[drv] || randomColor();
        usedColors[color] = (usedColors[color] || 0) + 1;
        const dash = usedColors[color] > 1 ? [5, 5] : [];
        let ds = acc.find(d => d.label === drv);
        if (!ds) {
          ds = {
            label: drv,
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
          acc.push(ds);
        }
        ds.data.push({ x: lap.lapNumber, y: parseTime(lap.lapTime) });
        return acc;
      }, []);

    const cfg = {
      type: 'line',
      data: { datasets },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Lap Number' },
            min: xMin,
            max: xMax,
            grid: { display: true, color: '#333' }
          },
          y: {
            title: { display: false },
            min: yMin,
            max: yMax,
            grid: { display: true, color: '#333' },
            ticks: {
              callback: value => {
                const m = Math.floor(value / 60);
                const s = Math.round(value % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
              }
            }
          }
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
              label: ctx => {
                const secs = ctx.parsed.y;
                const minutes = Math.floor(secs / 60);
                const seconds = Math.floor(secs % 60).toString().padStart(2, '0');
                const milliseconds = Math.round((secs - Math.floor(secs)) * 1000)
                  .toString()
                  .padStart(3, '0');
                return `${ctx.dataset.label}: ${minutes}:${seconds}.${milliseconds}`;
              }
            }
          },
          zoom: {
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: false },
              drag: {
                enabled: true,
                borderColor: '#888',
                backgroundColor: 'rgba(136,136,136,0.3)'
              },
              mode: 'x',
              // when zoom completes, recalc Y-axis to visible data
              onZoomComplete({ chart }) {
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;
                const minX = xScale.min;
                const maxX = xScale.max;
                const visibleYs = [];
                chart.data.datasets.forEach((ds, dsIndex) => {
                  if (chart.isDatasetVisible(dsIndex)) {
                    ds.data.forEach(pt => {
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
                  // show minute:second.millisecond on zoom
                  yScale.options.ticks.callback = value => {
                    const minutes = Math.floor(value / 60);
                    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
                    const ms = Math.round((value - Math.floor(value)) * 1000)
                      .toString()
                      .padStart(3, '0');
                    return `${minutes}:${seconds}.${ms}`;
                  };
                  chart.update();
                }
              }
            },
            pan: {
              enabled: false,
              mode: 'x'
            }
          }
        },
        interaction: { mode: 'index', intersect: false },
      },
      // register custom plugins here
      plugins: [verticalLinePlugin]
    };

    // destroy previous if any
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, cfg);
  }, [data, selectedDrivers, teamColors]);

  // toggle driver in selection
  const toggleDriver = drv => {
    setSelectedDrivers(sel =>
      sel.includes(drv) ? sel.filter(d => d !== drv) : [...sel, drv]
    );
  };

  const resetAll = () => {
    if (!driverOrder || driverOrder.length === 0) return;
    // reset to the top 3 finishers
    setSelectedDrivers(driverOrder.slice(0, 3));
  };

  const lapData = data && Array.isArray(data.laps) ? data.laps : [];

  return (
    <div style={{
      position: 'relative',
      padding: 20,
      background: '#111',
      color: '#fff',
      borderRadius: 8
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <h3 style={{ margin: 0 }}>Lap Times Chart</h3>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={resetAll}
          style={{
            padding: '4px 8px',
            background: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>
      <div style={{ position: 'relative', height: 400 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 12 }}>
        {data &&
          Object.values(driverOrder)
            .filter(drv => lapData.some(l => l.driver === drv))
            .map(drv => {
              const isSelected = selectedDrivers.includes(drv);
              return (
                <button
                  key={drv}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => toggleDriver(drv)}
                  style={{
                    padding: '4px 8px',
                    background: isSelected ? teamColors[drv] : '#444',
                    color: isSelected ? '#fff' : (teamColors[drv] || '#fff'),
                    border: isSelected ? `2px solid ${teamColors[drv]}` : 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
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

// helper to pick a color — replace with your team colors if you like
function randomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

export default LapsChart;