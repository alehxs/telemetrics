import React, { useState, useEffect } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL;


const TrackDominance = ({ year, grandPrix, session }) => {
  const [imageData, setImageData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrackDominance = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/track_dominance/?year=${year}&grand_prix=${grandPrix}&session=${session}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch track dominance data");
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob); // Convert blob to a URL
        setImageData(imageUrl);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchTrackDominance();
  }, [year, grandPrix, session]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="track-dominance-container">
      {imageData ? (
        <img
          src={imageData}
          alt="Track Dominance"
          className="track-dominance-image"
        />
      ) : (
        <p>Loading track dominance...</p>
      )}
    </div>
  );
};

export default TrackDominance;