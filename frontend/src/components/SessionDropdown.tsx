import Dropdown from './Dropdown';
import { useSessionOptions } from '../hooks/useTelemetryData';

interface SessionDropdownProps {
  year: number;
  grandPrix: string;
  onSelect: (session: string) => void;
}

const SessionDropdown = ({ year, grandPrix, onSelect }: SessionDropdownProps) => {
  const { data: sessionOptions } = useSessionOptions(year, grandPrix);

  const options = sessionOptions
    .map((s) => s.value)
    .filter((session) => session && session !== 'None');

  return (
    <Dropdown
      options={options}
      placeholder="Session"
      onSelect={(value) => onSelect(String(value))}
    />
  );
};

export default SessionDropdown;
