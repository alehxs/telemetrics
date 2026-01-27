import Dropdown from './Dropdown';
import { useSessionOptions } from '../hooks/useTelemetryData';

interface SessionDropdownProps {
  year: number;
  grandPrix: string;
  onSelect: (session: string) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const SessionDropdown = ({ year, grandPrix, onSelect, isOpen, onOpenChange }: SessionDropdownProps) => {
  const { data: sessionOptions } = useSessionOptions(year, grandPrix);

  const options = sessionOptions
    .map((s) => s.value)
    .filter((session) => session && session !== 'None');

  return (
    <Dropdown
      options={options}
      placeholder="Session"
      onSelect={(value) => onSelect(String(value))}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    />
  );
};

export default SessionDropdown;
