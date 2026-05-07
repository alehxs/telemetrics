import Dropdown from './Dropdown';
import { useAvailableYears } from '../hooks/useTelemetryData';

interface YearDropdownProps {
  onSelect: (year: number) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  defaultValue?: string;
}

const YearDropdown = ({ onSelect, isOpen, onOpenChange, defaultValue }: YearDropdownProps) => {
  const years = useAvailableYears();

  return (
    <Dropdown
      options={years}
      placeholder="Year"
      onSelect={(value) => onSelect(Number(value))}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      defaultValue={defaultValue}
    />
  );
};

export default YearDropdown;
