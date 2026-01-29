import { Bell, Sun, Moon } from 'lucide-react';
import beeLogo from 'figma:asset/00e8dad908adeeb8c2be2fabcc34220a5cb2f200.png';
import { useTheme } from './ThemeContext';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`h-16 px-6 flex items-center justify-between border-b ${
      theme === 'dark' 
        ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Left side - Logo and App Name */}
      <div className="flex items-center gap-3">
        <img 
          src={beeLogo} 
          alt="Beebliotheca" 
          className="w-10 h-10"
        />
        <h1 className={`text-xl ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>Beebliotheca</h1>
      </div>

      {/* Right side - Notifications and Theme Toggle */}
      <div className="flex items-center gap-2">
        <button className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors relative ${
          theme === 'dark'
            ? 'bg-[#0f0f0f] hover:bg-[#222] border-[#2a2a2a]'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        }`}>
          <Bell className="w-5 h-5 text-gray-400" />
          {/* Optional notification badge */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#BC6B6B] rounded-full"></span> */}
        </button>
        
        <button 
          onClick={toggleTheme}
          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
            theme === 'dark'
              ? 'bg-[#0f0f0f] hover:bg-[#222] border-[#2a2a2a]'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}
