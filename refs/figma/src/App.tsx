import { useState } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LibraryCatalog } from './components/LibraryCatalog';
import { BookClubs } from './components/BookClubs';
import { AdminUsers } from './components/AdminUsers';
import { ReadingLists } from './components/ReadingLists';
import { Series } from './components/Series';
import { Libraries } from './components/Libraries';
import { Book, Hexagon } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('books');
  const { theme } = useTheme();

  const renderPage = () => {
    switch (currentPage) {
      case 'books':
        return <LibraryCatalog />;
      case 'lists':
        return <ReadingLists />;
      case 'clubs':
        return <BookClubs />;
      case 'series':
        return <Series />;
      case 'libraries':
        return <Libraries />;
      case 'admin':
        return <AdminUsers />;
      case 'settings':
        return (
          <div className={`flex-1 min-h-screen flex items-center justify-center ${
            theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'
          }`}>
            <div className="text-center relative">
              {/* Honeycomb pattern background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <svg key={i} viewBox="0 0 100 100" className="w-16 h-16">
                      <polygon 
                        points="50,5 90,30 90,70 50,95 10,70 10,30" 
                        fill="currentColor" 
                        className="text-[#8CE2D0]" 
                      />
                    </svg>
                  ))}
                </div>
              </div>
              
              <div className="relative z-10">
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full border-2 border-[#8CE2D0] flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
                }`}>
                  <Book className="w-10 h-10 text-[#8CE2D0]" />
                </div>
                <h2 className={`text-xl mb-2 capitalize ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{currentPage}</h2>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  This section is coming soon...
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <LibraryCatalog />;
    }
  };

  return (
    <div className={`min-h-screen flex ${
      theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'
    }`}>
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col">
        <Header />
        {renderPage()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
