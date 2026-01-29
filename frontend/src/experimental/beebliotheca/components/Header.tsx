import { Bell, Moon, Sun } from "lucide-react";

import { useTheme } from "../ThemeContext";

const baseButton =
  "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors";

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b ${
        darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#8CE2D0]/20 border border-[#8CE2D0]/40 flex items-center justify-center text-[#8CE2D0] font-semibold">
          B
        </div>
        <div>
          <p
            className={`text-xs uppercase tracking-wider ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Personal library
          </p>
          <h1 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Beebliotheca
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className={`${baseButton} ${
            darkMode
              ? "bg-[#0f0f0f] border-[#2a2a2a] hover:bg-[#1f1f1f]"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
          }`}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-400" />
        </button>
        <button
          className={`${baseButton} ${
            darkMode
              ? "bg-[#0f0f0f] border-[#2a2a2a] hover:bg-[#1f1f1f]"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
          }`}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-gray-200" />
          ) : (
            <Moon className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>
    </header>
  );
};
