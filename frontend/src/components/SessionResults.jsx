const SessionResults = ({ results }) => {
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
    <div
      className="bg-black bg-opacity-80 w-[300px] mx-auto p-2 rounded-lg shadow-lg text-white"
      style={{ backdropFilter: "blur(5px)" }}
    >
      <h2 className="text-xl font-bold mb-2 text-center font-[Formula1 Display]">
        F1 Race Results
      </h2>
      <div className="divide-y divide-black">
        <div className="flex items-center py-2 font-semibold bg-black bg-opacity-90">
          <span className="flex-[0.3] text-center">POS</span>
          <span className="flex-[1] text-left">DRIVER</span>
          <span className="flex-[1] text-right">TIME</span>
        </div>
        {results.map((driver, index) => (
          <div
            key={index}
            className={`flex items-center py-1 ${
              index % 2 === 0 ? "bg-black bg-opacity-90" : "bg-black bg-opacity-80"
            }`}
          >
            <span className="flex-[0.3] text-center text-lg font-bold">
              {driver.Position || "N/A"}
            </span>
            <span className="flex-[1] text-left flex items-center gap-2">
              {/* Commented out team logo */}
              {/* <img
                src={driver.TeamLogo || "/placeholder-logo.png"}
                alt={driver.TeamName || "Team"}
                className="w-5 h-5"
              /> */}
              <span>{driver.Abbreviation}</span>
            </span>
            <span className="flex-[1] text-right font-mono">
              {getDisplayTime(driver, leaderTime, index === 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionResults;