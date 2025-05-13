import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SessionInfo = ({ year, grandPrix, session }) => {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const { data, error } = await supabase
          .from("telemetry_data")
          .select("payload")
          .eq("year", year)
          .eq("grand_prix", grandPrix)
          .eq("session", session)
          .eq("data_type", "get_session_data")
          .single();

        if (error) throw error;
        setSessionData(data.payload);
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