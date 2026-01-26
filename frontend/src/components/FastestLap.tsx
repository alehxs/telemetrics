import { useFastestLap } from '../hooks/useTelemetryData';
import { formatLeaderTime } from '../utils/formatters';
import { getTyreSvgPath, F1_COLORS } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const FastestLap = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: fastestLap, loading } = useFastestLap(year, grandPrix, session);

  if (loading || !fastestLap) {
    return <div className="text-gray-500">Loading fastest lap...</div>;
  }

  const {
    Driver: abbreviation,
    LapTime: time,
    LapNumber: lap,
    TyreAge: tyreLife,
    TyreCompound: tyreCompound,
  } = fastestLap;

  const formattedTime = formatLeaderTime(time);
  const fastestLapSvgPath = 'svgs/fastestlap.svg';
  const tyreSvgPath = getTyreSvgPath(tyreCompound);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <div
        className="px-4 py-3"
        style={{ backgroundColor: F1_COLORS.FASTEST_LAP }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <img src={fastestLapSvgPath} alt="Timer icon" className="w-5 h-5" />
            <span className="font-bold text-white text-sm">FASTEST LAP</span>
          </div>

          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <img src={tyreSvgPath} alt={`${tyreCompound} Tyre`} className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">{formattedTime}</span>
            </div>
            <span className="text-sm">-</span>
            <strong className="text-lg">{abbreviation}</strong>
            <span className="text-sm">LAP {lap}</span>
            <span className="text-xs text-purple-200">Age: {tyreLife}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastestLap;
