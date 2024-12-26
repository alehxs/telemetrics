import { useState, useEffect } from "react";
import YearDropdown from "./components/YearDropdown";
import GrandPrixDropdown from "./components/GrandPrixDropdown";
import SessionDropdown from "./components/SessionDropdown";
import DriverInfo from "./components/DriverInfo";

const Home = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [results, setResults] = useState([]);

  // Fetch session results whenever year, grand prix, and session are selected
  useEffect(() => {
    const fetchResults = async () => {
      if (selectedYear && selectedGrandPrix && selectedSession) {
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/session_results/?year=${selectedYear}&grand_prix=${encodeURIComponent(
              selectedGrandPrix
            )}&session=${selectedSession}`
          );
          const data = await response.json();
          setResults(data);
        } catch (error) {
          console.error("Error fetching session results:", error);
          setResults([]);
        }
      }
    };

    fetchResults();
  }, [selectedYear, selectedGrandPrix, selectedSession]);

  return (
    <div className="p-8">
      <div className="flex flex-wrap gap-4">
        {/* Year Dropdown */}
        <YearDropdown onSelect={(year) => setSelectedYear(year)} />

        {/* Grand Prix Dropdown */}
        {selectedYear && (
          <GrandPrixDropdown
            year={selectedYear}
            onSelect={(grandPrix) => setSelectedGrandPrix(grandPrix)}
          />
        )}

        {/* Session Dropdown */}
        {selectedYear && selectedGrandPrix && (
          <SessionDropdown
            year={selectedYear}
            grandPrix={selectedGrandPrix}
            onSelect={(session) => setSelectedSession(session)}
          />
        )}
      </div>

      {/* Display Selected Session */}
      {selectedSession && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Selected Session</h2>
          <p>{selectedSession}</p>
        </div>
      )}

      {/* Display Driver Info */}
      {results.length > 0 && (
        <div className="mt-8">
          <DriverInfo results={results} />
        </div>
      )}
    </div>
  );
};

export default Home;