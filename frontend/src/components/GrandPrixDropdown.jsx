import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";

const GrandPrixDropdown = ({ year, onSelect }) => {
  const [grandPrixList, setGrandPrixList] = useState([]);

  useEffect(() => {
    const fetchGrandPrix = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/grand_prix/?year=${year}`
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
      placeholder={`Select Grand Prix (${year})`}
      onSelect={onSelect}
    />
  );
};

export default GrandPrixDropdown;