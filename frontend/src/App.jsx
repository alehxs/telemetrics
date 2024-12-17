import { useState } from "react";
import YearDropdown from "./components/YearDropdown";
import GrandPrixDropdown from "./components/GrandPrixDropdown";
import SessionDropdown from "./components/SessionDropdown";

const Home = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  return (
    <div className="p-8">
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

      {/* Display Selected Data */}
      {selectedSession && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Selected Session</h2>
          <p>{selectedSession}</p>
        </div>
      )}
    </div>
  );
};

export default Home;