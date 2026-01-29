import { Outlet } from "react-router-dom";

import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { useTheme } from "../contexts/ThemeContext";

const AppLayout = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className={`min-h-screen flex ${darkMode ? "bg-coal text-white" : "bg-gray-50 text-gray-900"}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className={`flex-1 ${darkMode ? "bg-coal" : "bg-gray-50"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
