import {
  Book,
  BookOpen,
  Library,
  List,
  Settings,
  User,
  Users
} from "lucide-react";

import { useTheme } from "../ThemeContext";

const menuItems = [
  { id: "books", label: "Books", icon: Book },
  { id: "lists", label: "Lists", icon: List },
  { id: "clubs", label: "Book Clubs", icon: Users },
  { id: "series", label: "Series", icon: BookOpen },
  { id: "libraries", label: "Libraries", icon: Library },
  { id: "admin", label: "Admin", icon: User },
  { id: "settings", label: "Settings", icon: Settings }
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string;
}

export const Sidebar = ({
  currentPage,
  onNavigate,
  userName = "Michele"
}: SidebarProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <aside
      className={`w-48 border-r ${
        darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"
      } flex flex-col`}
    >
      <div className={`p-4 border-b ${darkMode ? "border-[#1f1f1f]" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#8CE2D0]/20 border border-[#8CE2D0]/40 flex items-center justify-center text-[#8CE2D0] font-medium">
            {userName.charAt(0)}
          </div>
          <div>
            <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>Welcome</p>
            <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {userName}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all ${
                active
                  ? darkMode
                    ? "bg-[#1f2a2a] text-white border-l-2 border-[#8CE2D0]"
                    : "bg-gray-100 text-gray-900 border-l-2 border-[#8CE2D0]"
                  : darkMode
                    ? "text-gray-400 hover:bg-[#1b1b1b] hover:text-white"
                    : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
