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
    <div className="p-1 w-64 mx-auto bg-gray-100 overflow-x-auto">
      <h2 className="text-lg font-bold mb-1 text-left">Event Results</h2>
      <div className="divide-y divide-gray-300 bg-white rounded-md shadow-lg">
        <div className="flex items-center px-1 py-0.5 bg-gray-300 font-semibold">
          <span className="text-sm flex-[0.5] text-left">Position</span>
          <span className="text-sm flex-[0.6] text-center">Driver</span>
          <span className="text-sm flex-[1.4] text-right">Time</span>
        </div>
        {results.map((driver, index) => (
          <div
            key={index}
            className={`flex items-center px-1 py-0.5 ${
              index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
            }`}
          >
            <span className="text-sm font-medium flex-[0.5] text-left">
              {driver.Position || "N/A"}
            </span>
            <span className="text-sm font-bold flex-[0.6] text-center">
              {driver.Abbreviation}
            </span>
            <span className="text-sm flex-[1.4] text-right">
              {getDisplayTime(driver, leaderTime, index === 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionResults;