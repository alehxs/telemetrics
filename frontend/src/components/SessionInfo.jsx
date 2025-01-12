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
    return null;
  }

  const {
    Country = "Unknown",
    Location = "Unknown",
    EventName = "Unknown Event",
    EventDate = "Unknown Date",
    OfficialEventName = "Unknown",
    TotalLaps = "Unknown",
  } = sessionData;

  // Convert EventDate to formatted string
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formattedDate = formatDate(EventDate);

  return (
    <div className="p-4 bg-white rounded-md shadow-md text-gray-900">
      <h2 className="text-3xl font-bold mb-2">{OfficialEventName}</h2>
      <p className="text-xl text-gray-700">
        {Location}, {Country}
      </p>
      <p className="text-xl text-gray-700">{formattedDate}</p>
      <p className="text-xl text-gray-700">{TotalLaps} Laps</p>
    </div>
  );
};

export default SessionInfo;