import { useState, useEffect } from "react";

const SessionInfo = ({ year, grandPrix, session }) => {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/get_session_data/?year=${year}&grand_prix=${encodeURIComponent(
            grandPrix
          )}&session=${session}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch session data");
        }

        const data = await response.json();
        setSessionData(data);
      } catch (error) {
        console.error("Error fetching session data:", error);
        setSessionData(null);
      }
    };

    if (year && grandPrix && session) {
      fetchSessionData();
    }
  }, [year, grandPrix, session]);

  if (!sessionData) {
    return <div className="text-gray-500">Loading session information...</div>;
  }

  const { event, session_name, drivers, total_laps, weather_data_available } = sessionData;

  return (
    <div className="p-4 bg-white rounded-md shadow-md text-gray-900">
      <h2 className="text-xl font-bold mb-2">{event.name}</h2>
      <p className="text-sm text-gray-700">Location: {event.location}</p>
      <p className="text-sm text-gray-700">Date: {event.date}</p>
      <p className="text-sm text-gray-700">Session: {session_name}</p>
      <p className="text-sm text-gray-700">
        Total Laps: {total_laps || "Unknown"}
      </p>
      <p className="text-sm text-gray-700">
        Weather Data Available: {weather_data_available ? "Yes" : "No"}
      </p>
      <div className="mt-2">
        <h3 className="text-md font-semibold">Drivers:</h3>
        <ul className="list-disc pl-4">
          {drivers.map((driver) => (
            <li key={driver} className="text-sm text-gray-700">
              {driver}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SessionInfo;