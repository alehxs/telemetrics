import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";

const SessionDropdown = ({ year, grandPrix, onSelect }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/sessions/?year=${year}&grand_prix=${encodeURIComponent(grandPrix)}`
        );

        const data = await response.json();
        const sessionValues = Object.values(data).filter((value) => value !== null && value !== "None")
        .reverse();

        setSessions(sessionValues);
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
