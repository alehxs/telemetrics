import { useFastestLap } from '../hooks/useTelemetryData';
import { formatLeaderTime } from '../utils/formatters';
import { getTyreSvgPath, F1_COLORS } from '../utils/constants';
import type { TelemetryComponentProps } from '../types/telemetry';

const FastestLap = ({ year, grandPrix, session }: TelemetryComponentProps) => {
  const { data: fastestLap, loading } = useFastestLap(year, grandPrix, session);

  if (loading || !fastestLap) {
    return (
      <div className="bg-gradient-to-b from-[#1C1F38] to-[#14172A] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden border border-[#2A2D45] border-t-white/[0.08]">
        <div className="px-4 py-3" style={{ backgroundColor: F1_COLORS.FASTEST_LAP }}>
          <div className="flex items-center gap-2">
            <img src="svgs/fastestlap.svg" alt="Timer icon" className="w-4 h-4" />
            <span className="font-bold text-white/50 text-sm">FASTEST LAP</span>
          </div>
        </div>
      </div>
    );
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
    <div className="bg-gradient-to-b from-[#1C1F38] to-[#14172A] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden border border-[#2A2D45] border-t-white/[0.08]">
      <div
        className="px-4 py-3"
        style={{ backgroundColor: F1_COLORS.FASTEST_LAP }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <img src={fastestLapSvgPath} alt="Timer icon" className="w-4 h-4" />
            <span className="font-bold text-white text-sm">FASTEST LAP</span>
          </div>

          <div className="flex items-center gap-3 text-white">
            <div className="flex items-center gap-2">
              <img src={tyreSvgPath} alt={`${tyreCompound} Tyre`} className="w-5 h-5" />
              <span className="font-formula1 text-sm font-bold">{formattedTime}</span>
            </div>
            <span className="border-l border-white/50 h-4" />
            <span className="text-sm font-bold">{abbreviation}</span>
            <span className="text-sm text-white/70">LAP {lap}</span>
            <span className="text-sm text-white/70">Age: {tyreLife}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastestLap;
