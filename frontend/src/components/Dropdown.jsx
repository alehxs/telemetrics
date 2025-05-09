import { useState, useEffect } from "react";

const Dropdown = ({ options, placeholder, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  const handleSearchChange = (e) => {
    const value = e.target.value.trim();
    setSearchTerm(value);

    const newFilteredOptions = options.filter((option) => {
      if (typeof option === "string") {
        return option.toLowerCase().includes(value.toLowerCase());
      } else if (typeof option === "number") {
        return option.toString().includes(value);
      }
      return false; // Skip options of unsupported types
    });

    setFilteredOptions(newFilteredOptions);
    setHighlightedIndex(0);
  };

  const handleOptionClick = (option) => {
    setSearchTerm(option);
    setIsOpen(false);
    if (onSelect) onSelect(option);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          Math.min(prevIndex + 1, filteredOptions.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          Math.max(prevIndex - 1, 0)
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm(""); // Clear search term when reopening dropdown
    setFilteredOptions(options); // Reset filtered options to show all options
    setHighlightedIndex(0);
  };

  return (
    <div className="relative w-64">
      <input
        type="text"
        className="w-full px-4 py-2 border rounded-md shadow-md"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={handleFocus}
        onClick={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute mt-2 w-full bg-white rounded-md shadow-lg z-10">
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map((option, index) => (
              <button
                key={index}
                className={`w-full px-4 py-2 text-left ${
                  index === highlightedIndex ? "bg-gray-100" : ""
                } hover:bg-gray-200`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute mt-2 w-full bg-white rounded-md shadow-lg z-10">
          <div className="px-4 py-2 text-gray-500">No results found</div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;