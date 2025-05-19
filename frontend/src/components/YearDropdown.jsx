import Dropdown from "./Dropdown";

const YearDropdown = ({ onSelect }) => {
  const years = [2024];

  return (
    <Dropdown
      options={years}
      placeholder="Year"
      onSelect={onSelect}
    />
  );
};

export default YearDropdown;