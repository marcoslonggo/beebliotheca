import { LucideIcon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  message?: string;
}

export const PagePlaceholder = ({
  icon: Icon,
  title,
  message = "This section is being migrated to the new design."
}: PagePlaceholderProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div
      className={`flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center ${
        darkMode ? "bg-coal" : "bg-gray-50"
      } p-8`}
    >
      <div className="text-center relative max-w-md">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <svg key={idx} viewBox="0 0 100 100" className="w-16 h-16 text-honey">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" />
              </svg>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full border-2 border-honey flex items-center justify-center ${darkMode ? "bg-[#121212]" : "bg-gray-100"}`}>
            <Icon className="w-10 h-10 text-honey" />
          </div>
          <h3 className={`text-2xl font-semibold capitalize mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            {title}
          </h3>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};
