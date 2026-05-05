import { useState, useEffect, useRef, useCallback } from 'react';

interface DropdownProps {
  options: (string | number)[];
  placeholder: string;
  onSelect: (option: string | number) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  renderOption?: (option: string | number) => React.ReactNode;
}

const Dropdown = ({ options, placeholder, onSelect, isOpen: externalIsOpen, onOpenChange, renderOption }: DropdownProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

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
        className="w-full px-4 py-3 md:py-2 text-base md:text-sm border border-[#2A2D45] rounded-md shadow-sm bg-[#16182A] text-[#F0F2FF] placeholder:text-[#4A5080] focus:outline-none focus:ring-2 focus:ring-[#3D4875] focus:border-[#3D4875]"
        autoComplete="off"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onClick={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute mt-1 w-full bg-[#16182A] border border-[#2A2D45] rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <button
              key={String(option)}
              className={`w-full px-4 py-3 md:py-2 text-base md:text-sm text-left text-[#F0F2FF] ${
                index === highlightedIndex ? 'bg-[#252B40]' : 'bg-[#16182A]'
              } hover:bg-[#1C1F36]`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleOptionClick(option)}
            >
              {renderOption ? renderOption(option) : option}
            </button>
          ))}
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute mt-1 w-full bg-[#16182A] border border-[#2A2D45] rounded-md shadow-lg z-50">
          <div className="px-4 py-2 text-[#8B92B8]">No results found</div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
