import { useState, useEffect, useRef, useCallback } from 'react';

interface DropdownProps {
  options: (string | number)[];
  placeholder: string;
  onSelect: (option: string | number) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  renderOption?: (option: string | number) => React.ReactNode;
  defaultValue?: string;
}

const Dropdown = ({ options, placeholder, onSelect, isOpen: externalIsOpen, onOpenChange, renderOption, defaultValue }: DropdownProps) => {
  const [searchTerm, setSearchTerm] = useState(defaultValue ?? '');
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  useEffect(() => {
    if (!isOpen) setSearchTerm(defaultValue ?? '');
  }, [defaultValue, isOpen]);

  const setIsOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalIsOpen(value);
      }
    },
    [onOpenChange]
  );

  const filteredOptions = searchTerm.trim() === ''
    ? options
    : options.filter((option) =>
        String(option).toLowerCase().includes(searchTerm.trim().toLowerCase())
      );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, setIsOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionClick = (option: string | number) => {
    setSearchTerm(String(option));
    setIsOpen(false);
    onSelect(option);
  };

  const handleFocus = () => {
    setSearchTerm('');
    setHighlightedIndex(0);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          Math.min(prevIndex + 1, filteredOptions.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex] !== undefined) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full md:w-56 lg:w-64">
      <input
        type="text"
        className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-white/[0.12] rounded-md shadow-sm bg-[#1A1A22] text-white placeholder:text-[#4A4A58] focus:outline-none focus:ring-2 focus:ring-[#E10600] focus:border-[#E10600] cursor-pointer"
        autoComplete="off"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onClick={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute mt-1 w-full bg-[#1A1A22] border border-white/[0.12] rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <button
              key={String(option)}
              className={`w-full px-4 py-3 md:py-2 text-base md:text-sm text-left text-white ${
                index === highlightedIndex ? 'bg-[#252530]' : 'bg-[#1A1A22]'
              } hover:bg-[#1E1E28]`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleOptionClick(option)}
            >
              {renderOption ? renderOption(option) : option}
            </button>
          ))}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute mt-1 w-full bg-[#1A1A22] border border-white/[0.12] rounded-md shadow-lg z-50">
          <div className="px-4 py-2 text-[#888892]">No results found</div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
