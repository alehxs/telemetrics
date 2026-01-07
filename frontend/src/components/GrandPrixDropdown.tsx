import Dropdown from './Dropdown';
import { useGrandPrixOptions } from '../hooks/useTelemetryData';

interface GrandPrixDropdownProps {
  year: number;
  onSelect: (grandPrix: string) => void;
}

const GrandPrixDropdown = ({ year, onSelect }: GrandPrixDropdownProps) => {
  const { data: grandPrixOptions } = useGrandPrixOptions(year);

  const options = grandPrixOptions.map((gp) => gp.value);

  return (
    <Dropdown
      options={options}
      placeholder="Grand Prix"
      onSelect={(value) => onSelect(String(value))}
    />
  );
};

export default GrandPrixDropdown;
