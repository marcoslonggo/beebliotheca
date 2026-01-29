import { SelectHTMLAttributes } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = ({ label, error, options, className = "", children, ...props }: SelectProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2 rounded-lg ${
          darkMode
            ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white"
            : "bg-white border border-gray-300 text-gray-900"
        } focus:outline-none focus:ring-2 focus:ring-honey focus:border-transparent ${className}`}
        {...props}
      >
        {options ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
