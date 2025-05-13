import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const formatLeaderTime = (time) => {
  if (!time) return "N/A";

  const formattedTime = time.replace(/0 days\s|^00:/g, "").split(".");
  const timeWithoutLeadingZeros = formattedTime[0].replace(/^0:0/, "").replace(/^0:/, "");
  return `${timeWithoutLeadingZeros}.${formattedTime[1]?.slice(0, 3)}`;
};

const FastestLap = ({ year, grandPrix, session }) => {
  const [fastestLap, setFastestLap] = useState(null);

  useEffect(() => {
    const fetchFastestLap = async () => {
      try {
        const { data, error } = await supabase
          .from("telemetry_data")
          .select("payload")
          .eq("year", year)
          .eq("grand_prix", grandPrix)
          .eq("session", session)
          .eq("data_type", "fastest_lap")
          .single();
        if (error) throw error;

        // sanitize NaN if present
        const jsonString = JSON.stringify(data.payload).replace(/\bNaN\b/g, "null");
        const parsed = JSON.parse(jsonString);
        setFastestLap(parsed);
      } catch (error) {
        console.error("Error fetching fastest lap:", error);
        setFastestLap(null);
      }
    };

    if (year && grandPrix && session) {
      fetchFastestLap();
    }
  }, [year, grandPrix, session]);

  if (!fastestLap) {
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
  const fastestLapSvgPath = "svgs/fastestlap.svg";
  const tyreSvgPath = `svgs/${tyreCompound.toLowerCase()}tyre.svg`;

  return (
    <div
      className="flex items-center justify-between w-full py-2 px-4 rounded-md text-md text-white"
      style={{ backgroundColor: "#AE38E0" }}
    >
      <div className="flex items-center gap-2">
        <img src={fastestLapSvgPath} alt="Timer icon" className="w-6 h-6" />
        <span className="font-bold">FASTEST LAP</span>
      </div>
      <div className="flex items-center gap-2">
        <img src={tyreSvgPath} alt={`${tyreCompound} Tyre`} className="w-6 h-6" />
        <span>{formattedTime}</span>
        <span>-</span>
        <strong>{abbreviation}</strong>
      </div>
      <div className="flex items-center gap-4">
        <span>LAP {lap}</span>
        <span>Tyre Life: {tyreLife}</span>
      </div>
    </div>
  );
};

export default FastestLap;