import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import Dropdown from "./Dropdown";

const GrandPrixDropdown = ({ year, onSelect }) => {
  const [grandPrixList, setGrandPrixList] = useState([]);

  useEffect(() => {
    const fetchGrandPrix = async () => {
      try {
        const { data, error } = await supabase
          .from("telemetry_data")
          .select("grand_prix")
          .eq("year", year);
        if (error) throw error;
        const uniqueGP = [...new Set(data.map((item) => item.grand_prix))];
        setGrandPrixList(uniqueGP.reverse());
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