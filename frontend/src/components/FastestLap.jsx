import { useState, useEffect } from "react";

const formatLeaderTime = (time) => {
  if (!time) return "N/A";

  const formattedTime = time.replace("0 days ", "").split(".");
  const timeWithoutLeadingZeros = formattedTime[0].replace(/^0:0/, "").replace(/^0:/, "");
  return `${timeWithoutLeadingZeros}.${formattedTime[1]?.slice(0, 3)}`;
};

const FastestLap = ({ year, grandPrix, session }) => {
  const [fastestLap, setFastestLap] = useState(null);

  useEffect(() => {
    const fetchFastestLap = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/get_fastest_lap/?year=${year}&grand_prix=${encodeURIComponent(
            grandPrix
          )}&session=${session}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch fastest lap data");
        }

        const data = await response.json();
        setFastestLap(data);
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

  const { Driver: abbreviation, LapTime: time, LapNumber: lap, TyreAge: tyreLife, TyreCompound: tyreCompound } = fastestLap;

  const formattedTime = formatLeaderTime(time);

  return (
    <div className="fastest-lap bg-gray-200 py-2 px-4 rounded-md shadow-md text-sm text-center">
      <span className="font-bold">FASTEST LAP</span> ({formattedTime}) - {abbreviation} Lap {lap}  Tire Life ({tyreLife}) [{tyreCompound}]
    </div>
  );
};

export default FastestLap;