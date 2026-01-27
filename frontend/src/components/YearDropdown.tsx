import Dropdown from './Dropdown';
import { useAvailableYears } from '../hooks/useTelemetryData';

interface YearDropdownProps {
  onSelect: (year: number) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const YearDropdown = ({ onSelect, isOpen, onOpenChange }: YearDropdownProps) => {
  const { data: years } = useAvailableYears();

  return (
    <Dropdown
      options={years}
      placeholder="Year"
      onSelect={(value) => onSelect(Number(value))}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    />
  );
};

export default YearDropdown;
