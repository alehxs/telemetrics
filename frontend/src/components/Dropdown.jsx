import { useState, useEffect } from "react";

const Dropdown = ({ options, placeholder, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    const newFilteredOptions = options.filter((option) =>
      option.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredOptions(newFilteredOptions);
    setIsOpen(true);
  };

  const handleOptionClick = (option) => {
    setSearchTerm(option);
    setIsOpen(false);
    if (onSelect) onSelect(option);
  };

  return (
    <div className="relative w-64">
      <input
        type="text"
        className="w-full px-4 py-2 border rounded-md shadow-md"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="absolute mt-2 w-full bg-white rounded-md shadow-lg z-10">
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map((option, index) => (
              <button
                key={index}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;