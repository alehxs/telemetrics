const DriverInfo = ({ results }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Event Results</h2>
      <table className="min-w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2">Position</th>
            <th className="border border-gray-300 px-4 py-2">Driver</th>
            <th className="border border-gray-300 px-4 py-2">Team</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((driver, index) => (
            <tr key={index} className="text-center">
              <td className="border border-gray-300 px-4 py-2">
                {driver.Position || "N/A"}
              </td>
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
                <span>{driver.FullName}</span>
              </td>
              <td
                className="border border-gray-300 px-4 py-2"
                style={{
                  backgroundColor: driver.TeamColor || "#00000",
                  color: "#00000",
                }}
              >
                {driver.TeamName}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {driver.Status || "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DriverInfo;