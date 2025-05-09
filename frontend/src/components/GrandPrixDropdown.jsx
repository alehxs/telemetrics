import { useState, useEffect } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL;
import Dropdown from "./Dropdown";

const GrandPrixDropdown = ({ year, onSelect }) => {
  const [grandPrixList, setGrandPrixList] = useState([]);

  useEffect(() => {
    const fetchGrandPrix = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/grand_prix/?year=${year}`
        );
        const data = await response.json();
        const eventNames = data.map((gp) => gp.EventName).reverse();
        setGrandPrixList(eventNames);
      } catch (error) {
        console.error("Error fetching Grand Prix data:", error);
        setGrandPrixList([]);
      }
    };

    if (year) {
      fetchGrandPrix();
    }
  }, [year]);

  return (
    <Dropdown
      options={grandPrixList}
      placeholder={`Grand Prix`}
      onSelect={onSelect}
    />
  );
};

export default GrandPrixDropdown;