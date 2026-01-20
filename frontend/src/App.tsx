import { useState } from 'react';
import YearDropdown from './components/YearDropdown';
import GrandPrixDropdown from './components/GrandPrixDropdown';
import SessionDropdown from './components/SessionDropdown';
import SessionResults from './components/SessionResults';
import FastestLap from './components/FastestLap';
import SessionInfo from './components/SessionInfo';
import TrackDominance from './components/TrackDominance';
import Podium from './components/Podium';
import TyreStrategy from './components/TyreStrategy';
import LapsChart from './components/LapsChart';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';

const Home = () => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Reset dependent selections when parent changes
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedGrandPrix(null);
    setSelectedSession(null);
  };

  const handleGrandPrixSelect = (grandPrix: string) => {
    setSelectedGrandPrix(grandPrix);
    setSelectedSession(null);
  };

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen px-2 sm:px-4 md:px-6 py-4 md:py-8">
        <Header />

        {/* Dropdowns */}
        <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mb-6 md:mb-8 max-w-full md:max-w-none">
          <YearDropdown onSelect={handleYearSelect} />

          {selectedYear && (
            <GrandPrixDropdown
              year={selectedYear}
              onSelect={handleGrandPrixSelect}
            />
          )}

          {selectedYear && selectedGrandPrix && (
            <SessionDropdown
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              onSelect={setSelectedSession}
            />
          )}
        </div>

        {/* Content - only show when all 3 are selected */}
        {selectedYear && selectedGrandPrix && selectedSession && (
          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            <SessionInfo
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-4 md:space-y-6 lg:space-y-8">
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

              <div>
                <SessionResults
                  year={selectedYear}
                  grandPrix={selectedGrandPrix}
                  session={selectedSession}
                />
              </div>
            </div>

            <TyreStrategy
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />

            <LapsChart
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Home;
