import { useState } from 'react';
import YearDropdown from './components/YearDropdown';
import GrandPrixDropdown from './components/GrandPrixDropdown';
import SessionDropdown from './components/SessionDropdown';
import PredictionPodium from './components/PredictionPodium';
import SessionResults from './components/SessionResults';
import FastestLap from './components/FastestLap';
import SessionInfo from './components/SessionInfo';
import TrackDominance from './components/TrackDominance';
import Podium from './components/Podium';
import TyreStrategy from './components/TyreStrategy';
import LapsChart from './components/LapsChart';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import { useLatestSession } from './hooks/useTelemetryData';

const App = () => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'year' | 'grandprix' | 'session' | null>(null);

  const { data: latestSession } = useLatestSession();

  const displayCtx =
    selectedYear && selectedGrandPrix && selectedSession
      ? { year: selectedYear, grandPrix: selectedGrandPrix, session: selectedSession }
      : latestSession;

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

  const showGrandPrix = !!selectedYear && openDropdown !== 'year';
  const showSession = showGrandPrix && !!selectedGrandPrix && openDropdown !== 'grandprix';

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen bg-[#15151E] border-t-2 border-[#E10600] px-2 sm:px-4 md:px-6 xl:px-24 py-4 md:py-8">
        <Header />

        <PredictionPodium />

        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-6 mb-6 md:mb-8 max-w-full md:max-w-none">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#888892] uppercase px-1">Season</span>
            <YearDropdown
              onSelect={handleYearSelect}
              isOpen={openDropdown === 'year'}
              onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'year' : null)}
              defaultValue={selectedYear ? String(selectedYear) : undefined}
            />
          </div>

          {showGrandPrix && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-[#888892] uppercase px-1">Grand Prix</span>
              <GrandPrixDropdown
                year={selectedYear}
                onSelect={handleGrandPrixSelect}
                isOpen={openDropdown === 'grandprix'}
                onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'grandprix' : null)}
                defaultValue={selectedGrandPrix ?? undefined}
              />
            </div>
          )}

          {showSession && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-[#888892] uppercase px-1">Session</span>
              <SessionDropdown
                year={selectedYear}
                grandPrix={selectedGrandPrix}
                onSelect={setSelectedSession}
                isOpen={openDropdown === 'session'}
                onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'session' : null)}
                defaultValue={selectedSession ?? undefined}
              />
            </div>
          )}
        </div>

        {displayCtx && (
          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            <SessionInfo
              year={displayCtx.year}
              grandPrix={displayCtx.grandPrix}
              session={displayCtx.session}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6 lg:gap-8">
                <Podium
                  year={displayCtx.year}
                  grandPrix={displayCtx.grandPrix}
                  session={displayCtx.session}
                />
                <FastestLap
                  year={displayCtx.year}
                  grandPrix={displayCtx.grandPrix}
                  session={displayCtx.session}
                />
                <TrackDominance
                  year={displayCtx.year}
                  grandPrix={displayCtx.grandPrix}
                  session={displayCtx.session}
                />
              </div>

              <div className="flex flex-col">
                <SessionResults
                  year={displayCtx.year}
                  grandPrix={displayCtx.grandPrix}
                  session={displayCtx.session}
                />
              </div>
            </div>

            <TyreStrategy
              year={displayCtx.year}
              grandPrix={displayCtx.grandPrix}
              session={displayCtx.session}
            />

            <LapsChart
              year={displayCtx.year}
              grandPrix={displayCtx.grandPrix}
              session={displayCtx.session}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
