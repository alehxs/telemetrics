import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SessionDropdown = ({ year, grandPrix, onSelect }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("telemetry_data")
          .select("session")
          .eq("year", year)
          .eq("grand_prix", grandPrix);

        if (error) throw error;
        const uniqueSessions = [...new Set(data.map((item) => item.session))]
          .filter((session) => session && session !== "None")
          .reverse();

        setSessions(uniqueSessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setSessions([]);
      }
    };
    if (year && grandPrix) {
      fetchSessions();
    }
  }, [year, grandPrix]);

  return (
    <Dropdown
      options={sessions}
      placeholder={`Session`}
      onSelect={onSelect}
    />
  );
};

export default SessionDropdown;
