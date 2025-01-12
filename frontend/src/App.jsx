import { useState, useEffect } from "react";
import YearDropdown from "./components/YearDropdown";
import GrandPrixDropdown from "./components/GrandPrixDropdown";
import SessionDropdown from "./components/SessionDropdown";
import SessionResults from "./components/SessionResults";
import FastestLap from "./components/FastestLap";
import SessionInfo from "./components/SessionInfo";

const Home = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [results, setResults] = useState([]);

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
        <YearDropdown onSelect={(year) => setSelectedYear(year)} />
        {selectedYear && (
          <GrandPrixDropdown
            year={selectedYear}
            onSelect={(grandPrix) => setSelectedGrandPrix(grandPrix)}
          />
        )}
        {selectedYear && selectedGrandPrix && (
          <SessionDropdown
            year={selectedYear}
            grandPrix={selectedGrandPrix}
            onSelect={(session) => setSelectedSession(session)}
          />
        )}
      </div>

      <div className="mt-8">
        <SessionInfo 
          year={selectedYear} 
          grandPrix={selectedGrandPrix} 
          session={selectedSession} 
        />
        {results.length > 0 && (
          <>
            <FastestLap
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />
            <SessionResults className="text-left" results={results} />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;