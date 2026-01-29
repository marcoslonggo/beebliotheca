import { TextareaHTMLAttributes } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = ({ label, error, className = "", ...props }: TextareaProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2 rounded-lg ${
          darkMode
            ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500"
            : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
        } focus:outline-none focus:ring-2 focus:ring-honey focus:border-transparent resize-y ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
