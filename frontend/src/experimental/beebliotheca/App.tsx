import { Book } from "lucide-react";
import { useState } from "react";

import { ThemeProvider, useTheme } from "./ThemeContext";
import { AdminUsers } from "./components/AdminUsers";
import { BookClubs } from "./components/BookClubs";
import { Header } from "./components/Header";
import { LibraryCatalog } from "./components/LibraryCatalog";
import { Libraries } from "./components/Libraries";
import { ReadingLists } from "./components/ReadingLists";
import { Series } from "./components/Series";
import { Sidebar } from "./components/Sidebar";

const Placeholder = ({ title }: { title: string }) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div
      className={`flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}
    >
      <div className="text-center relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <svg key={idx} viewBox="0 0 100 100" className="w-16 h-16 text-[#8CE2D0]">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" />
              </svg>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-[#8CE2D0] flex items-center justify-center bg-[#121212]">
            <Book className="w-10 h-10 text-[#8CE2D0]" />
          </div>
          <h3 className="text-xl font-semibold capitalize">{title}</h3>
          <p className="text-sm text-gray-400 mt-2">This section is coming soon.</p>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState("books");

  const renderPage = () => {
    switch (currentPage) {
      case "books":
        return <LibraryCatalog />;
      case "lists":
        return <ReadingLists />;
      case "clubs":
        return <BookClubs />;
      case "series":
        return <Series />;
      case "libraries":
        return <Libraries />;
      case "admin":
        return <AdminUsers />;
      default:
        return <Placeholder title={currentPage} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f0f0f] text-white">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col">
        <Header />
        {renderPage()}
      </div>
    </div>
  );
};

export const BeebliothecaApp = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default BeebliothecaApp;
