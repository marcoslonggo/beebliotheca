import {
  Book,
  BookOpen,
  Home,
  Library,
  List,
  Settings,
  User,
  Users
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/dashboard" },
  { id: "books", label: "Books", icon: Book, path: "/books" },
  { id: "lists", label: "Lists", icon: List, path: "/lists" },
  { id: "clubs", label: "Book Clubs", icon: Users, path: "/book-clubs" },
  { id: "series", label: "Series", icon: BookOpen, path: "/series" },
  { id: "libraries", label: "Libraries", icon: Library, path: "/libraries" },
  { id: "admin", label: "Admin", icon: User, path: "/admin" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
];

export const Sidebar = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const darkMode = theme === "dark";

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <aside
      className={`w-48 border-r ${
        darkMode ? "bg-[#141414] border-[#1f1f1f]" : "bg-white border-gray-200"
      } flex flex-col`}
    >
      <div className={`p-4 border-b ${darkMode ? "border-[#1f1f1f]" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#8CE2D0]/20 border border-[#8CE2D0]/40 flex items-center justify-center text-[#8CE2D0] font-medium">
            {userName.charAt(0).toUpperCase()}
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
          // Special handling for dashboard to match both "/" and "/dashboard"
          const active = location.pathname === item.path ||
                        (item.id === "dashboard" && location.pathname === "/");
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
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
