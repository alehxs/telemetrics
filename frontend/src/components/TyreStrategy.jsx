import React, { useEffect, useState } from 'react';

const compoundColors = {
  SOFT: '#FF1E1E',          // red
  MEDIUM: '#FFD700',        // yellow
  HARD: '#FFFFFF',  
  INTERMEDIATE: '#00C16E',  // green
  WET: '#007BFF',           // blue
  UNKNOWN: '#999999'
};

const TyreStrategy = () => {
  const [tyreByLap, setTyreByLap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const year = 2023;
      const grand_prix = 'Monaco Grand Prix';
      const session = 'Race';
      const res = await fetch(
        `http://127.0.0.1:8000/api/lap_times_and_tyres/?year=${year}&grand_prix=${encodeURIComponent(grand_prix)}&session=${session}`
      );
      const raw = await res.json();

      const grouped = {};
      raw.forEach(({ Driver, LapNumber, Compound, Abbreviation }) => {
        const key = Abbreviation || Driver;
        if (!grouped[key]) grouped[key] = {};
        grouped[key][LapNumber] = Compound;
      });
      setTyreByLap(grouped);
    };

    fetchData();
  }, []);

  if (!tyreByLap || Object.keys(tyreByLap).length === 0) {
    return <p>No tyre data available.</p>;
  }

  const totalLaps = Math.max(...Object.values(tyreByLap).flatMap(driverLaps =>
    Object.keys(driverLaps).map(Number)
  ));

  const groupStints = (laps) => {
    const stints = [];
    let current = null;

    Object.entries(laps).forEach(([lap, compound]) => {
      const lapNum = parseInt(lap);
      if (!current || current.compound !== compound) {
        if (current) stints.push(current);
        current = { start: lapNum, end: lapNum, compound };
      } else {
        current.end = lapNum;
      }
    });

    if (current) stints.push(current);
    return stints;
  };

  return (
    <div style={{
      backgroundColor: '#1C1C1C',
      padding: '16px',
      borderRadius: '8px',
      width: `${totalLaps * 10 + 100}px`,
      margin: '0 auto'
    }}>
      <h2 style={{ color: '#fff' }}>Tyre Strategy by Lap</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '12px', marginBottom: '6px' }}>
        {[0, 20, 40, 60, totalLaps].map(mark => (
          <span key={mark}>{mark}</span>
        ))}
      </div>
      <div style={{ position: 'relative', height: '4px', marginBottom: '8px' }}>
        {[0, Math.floor(totalLaps / 2), totalLaps].map((mark, idx) => (
          <div key={idx} style={{
            position: 'absolute',
            left: `${(mark / totalLaps) * 100}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#888'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Object.entries(tyreByLap).map(([driver, laps]) => (
          <div key={driver} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 40, fontWeight: 'bold', color: '#fff' }}>{driver}</span>
            <div style={{
              display: 'flex',
              width: `${totalLaps * 10}px`,
              gap: '2px',
              overflow: 'hidden'
            }}>
              {groupStints(laps).map((stint, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: compoundColors[stint.compound] || compoundColors.UNKNOWN,
                    width: `${(stint.end - stint.start + 1) * 10}px`,
                    height: '20px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                    color: '#000',
                    fontSize: '12px',
                    textAlign: 'center',
                    lineHeight: '20px'
                  }}
                >
                  {stint.end - stint.start + 1}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TyreStrategy;
