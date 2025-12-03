import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  theme?: 'light' | 'dark';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, placeholder, theme = 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors font-mono flex items-center justify-between ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444] hover:bg-[#252525]' : 'bg-white border-gray-300 text-gray-800 focus:border-gray-400 hover:bg-gray-50'}`}
        type="button"
      >
        <span className="truncate mr-2">{value || placeholder}</span>
        <svg 
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-300'}`}>
            {options.map((option) => (
                <button
                key={option}
                onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-mono transition-colors block truncate ${
                    option === value 
                    ? isDark ? 'bg-emerald-900/30 text-gray-100 font-medium' : 'bg-emerald-50 text-gray-900 font-medium' 
                    : isDark ? 'text-gray-300 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                type="button"
                title={option}
                >
                {option}
                </button>
            ))}
        </div>
      )}
    </div>
  );
};
