import { useState, useEffect } from 'react';

interface DropdownProps {
  options: (string | number)[];
  placeholder: string;
  onSelect: (option: string | number) => void;
}

const Dropdown = ({ options, placeholder, onSelect }: DropdownProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<(string | number)[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

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
    setSearchTerm('');
    setFilteredOptions(options);
    setHighlightedIndex(0);
  };

  return (
    <div className="relative w-full md:w-56 lg:w-64">
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
