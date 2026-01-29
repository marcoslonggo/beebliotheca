import { Book, List, Users, BookOpen, Library, Settings, User } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userName?: string;
}

export function Sidebar({ currentPage, onNavigate, userName = "Michele" }: SidebarProps) {
  const { theme } = useTheme();
  
  const menuItems = [
    { id: 'books', label: 'Books', icon: Book },
    { id: 'lists', label: 'Lists', icon: List },
    { id: 'clubs', label: 'Book Clubs', icon: Users },
    { id: 'series', label: 'Series', icon: BookOpen },
    { id: 'libraries', label: 'Libraries', icon: Library },
    { id: 'admin', label: 'Admin', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`w-40 h-screen flex flex-col border-r ${
      theme === 'dark'
        ? 'bg-[#1a1a1a] border-[#2a2a2a]'
        : 'bg-white border-gray-200'
    }`}>
      <div className={`p-4 border-b ${
        theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#8CE2D0] flex items-center justify-center text-sm">
            {userName.charAt(0)}
          </div>
          <div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>Welcome back</p>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{userName}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                isActive 
                  ? theme === 'dark'
                    ? 'bg-[#2a2a2a] text-white border-l-2 border-[#8CE2D0]'
                    : 'bg-gray-100 text-gray-900 border-l-2 border-[#8CE2D0]'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-[#222] hover:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
