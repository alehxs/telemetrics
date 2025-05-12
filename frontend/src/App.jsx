import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

const Home = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

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
        {selectedYear && selectedGrandPrix && selectedSession && (
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
              <SessionResults
                year={selectedYear}
                grandPrix={selectedGrandPrix}
                session={selectedSession}
                className="text-left"
              />
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