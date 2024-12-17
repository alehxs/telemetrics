import Dropdown from "./Dropdown";

const YearDropdown = ({ onSelect }) => {
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

  return (
    <Dropdown
      options={years}
      placeholder="Select Year"
      onSelect={onSelect}
    />
  );
};

export default YearDropdown;