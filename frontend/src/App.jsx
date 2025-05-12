import { useState, useEffect } from "react";
import YearDropdown from "./components/YearDropdown";
import GrandPrixDropdown from "./components/GrandPrixDropdown";
import SessionDropdown from "./components/SessionDropdown";
import SessionResults from "./components/SessionResults";
import FastestLap from "./components/FastestLap";
import SessionInfo from "./components/SessionInfo";
import TrackDominance from "./components/TrackDominance";
import Podium from "./components/Podium";
import TyreStrategy from "./components/TyreStrategy";
import LapsChart from "./components/LapsChart";
const API_BASE_URL = import.meta.env.VITE_API_URL;

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
            `${API_BASE_URL}/api/session_results/?year=${selectedYear}&grand_prix=${encodeURIComponent(
              selectedGrandPrix
            )}&session=${selectedSession}`
          );
          const text = await response.text();
          // sanitize invalid NaN literals from practice sessions
          const sanitizedText = text.replace(/\bNaN\b/g, 'null');
          let data = [];
          try {
            data = JSON.parse(sanitizedText);
          } catch (parseError) {
            console.error("Invalid JSON response:", text);
          }
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
    <div className="max-w-screen-xl mx-auto px-4 pt-8">
      <div className="flex flex-wrap justify-center gap-4 w-full">
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

      <div className="mt-8 space-y-8 w-full">
        <SessionInfo 
          year={selectedYear} 
          grandPrix={selectedGrandPrix} 
          session={selectedSession} 
        />
        {results.length > 0 && (
          <>
        <div className="grid items-start grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          {/* Left column: stacked components */}
          <div className="flex flex-col space-y-8">
            <Podium
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />
            <FastestLap
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />
            <TrackDominance
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />
          </div>
          {/* Right column: session results */}
          <div className="space-y-8">
            <SessionResults className="text-left" results={results} />
          </div>
        </div>
        <div className="w-full">
          <TyreStrategy
            year={selectedYear}
            grandPrix={selectedGrandPrix}
            session={selectedSession}
          />
        </div>
        <LapsChart
          year={selectedYear}
          grandPrix={selectedGrandPrix}
          session={selectedSession}
        />
        </>
        )}
      </div>
    </div>
  );
};

export default Home;