import React, { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL;


const Podium = ({ year, grandPrix, session }) => {
  const [podiumData, setPodiumData] = useState([]);

  useEffect(() => {
    const fetchPodiumData = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/get_podium/?year=${year}&grand_prix=${encodeURIComponent(
            grandPrix
          )}&session=${session}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch podium data");
        }
        const data = await response.json();
        setPodiumData(data);
      } catch (error) {
        console.error("Error fetching podium data:", error);
      }
    };

    if (year && grandPrix && session) {
      fetchPodiumData();
    }
  }, [year, grandPrix, session]);

  return (
    <div className="flex justify-start items-center gap-6 py-0 px-0 w-full">
      {podiumData.map((driver, index) => (
        <div 
          key={index}
          className="flex-1 rounded-lg shadow-lg overflow-hidden backdrop-blur-sm p-4"
          style={{
            backgroundColor: `${driver.TeamColor}CC`,
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200">
              <img
                src={driver.HeadshotUrl || "/api/placeholder/128/128"}
                alt={`${driver.Abbreviation}'s headshot`}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">P{driver.Position}</div>
              <div className="text-2xl font-semibold mb-4">{driver.Abbreviation}</div>
            </div>

            <div className="w-24 h-24 flex items-center justify-center">
              <img
                src={`/telemetrics/src/assets/team_logos/${driver.TeamName.toLowerCase().replace(/\s+/g, "-")}.png`}
                alt={`${driver.TeamName} logo`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Podium;
