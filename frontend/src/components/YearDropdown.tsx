import Dropdown from './Dropdown';
import { useAvailableYears } from '../hooks/useTelemetryData';

interface YearDropdownProps {
  onSelect: (year: number) => void;
}

const YearDropdown = ({ onSelect }: YearDropdownProps) => {
  const { data: years } = useAvailableYears();

  return (
    <Dropdown
      options={years}
      placeholder="Year"
      onSelect={(value) => onSelect(Number(value))}
    />
  );
};

export default YearDropdown;
