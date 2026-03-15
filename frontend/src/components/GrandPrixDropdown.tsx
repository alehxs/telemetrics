import { useMemo } from 'react';
import Dropdown from './Dropdown';
import { useGrandPrixOptions } from '../hooks/useTelemetryData';
import ReactCountryFlag from 'react-country-flag';
import { getCountryCode } from '../utils/constants';

interface GrandPrixDropdownProps {
  year: number;
  onSelect: (grandPrix: string) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const GrandPrixDropdown = ({ year, onSelect, isOpen, onOpenChange }: GrandPrixDropdownProps) => {
  const { data: grandPrixOptions } = useGrandPrixOptions(year);

  const options = grandPrixOptions.map((gp) => gp.value);

  const countryMap = useMemo(
    () => new Map(grandPrixOptions.map((gp) => [gp.value, gp.country])),
    [grandPrixOptions]
  );

  return (
    <Dropdown
      options={options}
      placeholder="Grand Prix"
      onSelect={(value) => onSelect(String(value))}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      renderOption={(gp) => {
        const code = getCountryCode(countryMap.get(String(gp)) ?? '');
        return (
          <span className="flex items-center gap-2">
            {code && <ReactCountryFlag countryCode={code} svg style={{ width: '1.25em', height: '1.25em' }} />}
            {gp}
          </span>
        );
      }}
    />
  );
};

export default GrandPrixDropdown;
