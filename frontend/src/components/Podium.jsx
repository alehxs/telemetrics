import React, { useEffect, useState } from "react";

const Podium = ({ year, grandPrix, session }) => {
  const [podiumData, setPodiumData] = useState([]);

  useEffect(() => {
    const fetchPodiumData = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/get_podium/?year=${year}&grand_prix=${encodeURIComponent(
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
    <div className="podium-container">
      {podiumData.map((driver, index) => (
        <div
          key={index}
          className="podium-card"
          style={{ backgroundColor: driver.TeamColor }}
        >
          <div className="driver-info">
            <img
              src={driver.HeadshotUrl || "placeholder-headshot.png"}
              alt={`${driver.Abbreviation}'s headshot`}
              className="driver-headshot"
            />
            <h2 className="position">{driver.Position}</h2>
            <h3 className="abbreviation">{driver.Abbreviation}</h3>
          </div>
          <div className="team-logo">
            <img
              src={driver.TeamLogoUrl || "placeholder-logo.png"} // Replace with actual logo URL
              alt={`${driver.TeamName} logo`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Podium;