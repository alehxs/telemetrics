import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SessionResults = ({ year, grandPrix, session }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data, error } = await supabase
          .from("telemetry_data")
          .select("payload")
          .eq("year", year)
          .eq("grand_prix", grandPrix)
          .eq("session", session)
          .eq("data_type", "session_results")
          .single();

        if (error) throw error;
        setResults(data?.payload || []);
      } catch (err) {
        console.error("Failed to fetch session results:", err);
        setResults([]);
      }
    };

    if (year && grandPrix && session) fetchResults();
  }, [year, grandPrix, session]);

  const leaderTime = results[0]?.Time || null;

  const formatLeaderTime = (time) => {
    if (!time) return "N/A";
    const formattedTime = time.replace("0 days ", "").split(".");
    return `${formattedTime[0].replace(/^0/, "")}.${formattedTime[1]?.slice(0, 3)}`;
  };

  const formatIntervalTime = (time) => {
    if (!time) return "N/A";
    const match = time.match(/(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (!match) return "N/A";
    const [, hours, minutes, seconds] = match;
    const totalSeconds = parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
    return `+${totalSeconds.toFixed(3)}`;
  };

  const getDisplayTime = (driver, leaderTime, isLeader) => {
    const { Status, Time } = driver;
    if (Status.includes("+")) {
      const match = Status.match(/\+(\d+) Lap/);
      if (match) return `+${match[1]} Lap${match[1] > 1 ? "s" : ""}`;
    } else if (Status !== "Finished") {
      return "DNF";
    }
    return isLeader ? formatLeaderTime(Time) : formatIntervalTime(Time);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-center font-[Formula1 Display]"> Session Results</h2>
      <div className="w-full overflow-x-auto bg-black/80 backdrop-blur-sm rounded-lg shadow text-white">
        <table className="table-auto min-w-full border-collapse">
          <thead>
            <tr className="bg-red-600">
              <th className="px-3 py-2 text-left text-sm font-semibold">POS</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">DRIVER</th>
              <th className="px-3 py-2 text-right text-sm font-semibold">TIME</th>
            </tr>
          </thead>
          <tbody>
            {results.map((driver, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-gray-900 bg-opacity-60" : "bg-black bg-opacity-50"}>
                <td className="px-3 py-2 text-left font-bold">{driver.Position || "N/A"}</td>
                <td className="px-3 py-2 flex items-center gap-2">
                  {driver.TeamLogo && (
                    <img
                      src={driver.TeamLogo}
                      alt={driver.TeamName}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span>{driver.Abbreviation}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{getDisplayTime(driver, leaderTime, index === 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionResults;