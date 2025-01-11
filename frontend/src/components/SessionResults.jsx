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
    <div className="p-2 w-full max-w-md mx-auto bg-gray-100">
      <h2 className="text-balance font-bold mb-2 text-center">Event Results</h2>
      <div className="divide-y divide-gray-300 bg-white rounded-md shadow-lg">
        {results.map((driver, index) => (
          <div
            key={index}
            className={`flex items-center px-2 py-0.5 ${
              index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
            }`}
          >
            <span className="text-sm font-medium flex-[3] text-left">
              {driver.Position || "N/A"}
            </span>
            <span className="text-sm flex-[3] text-center">
              {driver.Abbreviation}
            </span>
            <span className="text-sm flex-[5] text-right">
              {getDisplayTime(driver, leaderTime, index === 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionResults;