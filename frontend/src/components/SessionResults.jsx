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

const SessionResults = ({ results }) => {
  const leaderTime = results[0]?.Time || null;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Event Results</h2>
      <table className="min-w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Position</th>
            <th className="border border-gray-300 px-4 py-2">Driver</th>
            <th className="border border-gray-300 px-4 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {results.map((driver, index) => (
            <tr key={index} className="text-center">
              <td className="border border-gray-300 px-4 py-2">{driver.Position || "N/A"}</td>
              <td className="border border-gray-300 px-4 py-2 flex items-center gap-2">
                {driver.HeadshotUrl ? (
                  <img
                    src={driver.HeadshotUrl}
                    alt={driver.FullName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span>No Image</span>
                )}
                <span>{driver.Abbreviation}</span>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {getDisplayTime(driver, leaderTime, index === 0)} {/* Time logic */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SessionResults;
