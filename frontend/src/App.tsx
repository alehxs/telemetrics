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
      <div className="container mx-auto px-4 py-8">
        <Header />

        {/* Dropdowns */}
        <div className="flex justify-center gap-4 mb-8">
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
          <div className="space-y-8">
            <SessionInfo
              year={selectedYear}
              grandPrix={selectedGrandPrix}
              session={selectedSession}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
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
