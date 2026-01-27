import { useState, useEffect, useRef } from 'react';

interface DropdownProps {
  options: (string | number)[];
  placeholder: string;
  onSelect: (option: string | number) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const Dropdown = ({ options, placeholder, onSelect, isOpen: externalIsOpen, onOpenChange }: DropdownProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<(string | number)[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  // Reset search state when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setFilteredOptions(options);
      setHighlightedIndex(0);
    }
  }, [isOpen, options]);

  // Close dropdown when clicking outside
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
  }, [isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setSearchTerm(value);

    const newFilteredOptions = options.filter((option) => {
      if (typeof option === 'string') {
        return option.toLowerCase().includes(value.toLowerCase());
      } else if (typeof option === 'number') {
        return option.toString().includes(value);
      }
      return false;
    });

    setFilteredOptions(newFilteredOptions);
    setHighlightedIndex(0);
  };

  const handleOptionClick = (option: string | number) => {
    setSearchTerm(String(option));
    setIsOpen(false);
    onSelect(option);
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

  const handleFocus = () => {
    setIsOpen(true);
    // Reset state is now handled by useEffect to avoid duplication
  };

  return (
    <div ref={dropdownRef} className="relative w-full md:w-56 lg:w-64">
      <input
        type="text"
        className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onClick={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <button
              key={index}
              className={`w-full px-4 py-3 md:py-2 text-base md:text-sm text-left text-gray-900 ${
                index === highlightedIndex ? 'bg-blue-100' : 'bg-white'
              } hover:bg-blue-50`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="px-4 py-2 text-gray-500">No results found</div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
