import React, { useEffect, useState } from "react";

const SessionResults = ({ year, grandPrix }) => {
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setError(null);
        const response = await fetch(
          `http://127.0.0.1:8000/api/get_session_data/?year=${year}&grand_prix=${encodeURIComponent(grandPrix)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch session data: ${response.statusText}`);
        }

        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        setError(err.message);
        setSessionData(null);
      }
    };

    if (year && grandPrix) {
      fetchSessionData();
    }
  }, [year, grandPrix]);

  if (error) {
    return (
      <div className="p-4 w-full max-w-md mx-auto bg-gray-100">
        <h2 className="text-lg font-bold mb-2 text-center">Event Information</h2>
        <div className="bg-white rounded-md shadow-md p-4">
          <p className="text-center text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-4 w-full max-w-md mx-auto bg-gray-100">
        <h2 className="text-lg font-bold mb-2 text-center">Event Information</h2>
        <div className="bg-white rounded-md shadow-md p-4">
          <p className="text-center text-gray-500">No session data available</p>
        </div>
      </div>
    );
  }

  const sessionInfo = [
    { label: "Country", value: sessionData.Country },
    { label: "Location", value: sessionData.Location },
    { label: "Event Name", value: sessionData.EventName },
    { label: "Event Date", value: sessionData.EventDate },
    { label: "Official Event Name", value: sessionData.OfficialEventName },
  ];

  return (
    <div className="p-4 w-full max-w-md mx-auto bg-gray-100">
      <h2 className="text-lg font-bold mb-2 text-center">Event Information</h2>
      <div className="bg-white rounded-md shadow-md p-4 space-y-2">
        {sessionInfo.map((item) => (
          <div key={item.label} className="flex justify-between items-center">
            <span className="font-bold">{item.label}:</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionResults;