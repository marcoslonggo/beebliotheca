import { ReactNode } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div
      className={`${
        darkMode
          ? "bg-[#1a1a1a] border border-[#2a2a2a]"
          : "bg-white border border-gray-200"
      } rounded-xl p-6 shadow-soft-card ${className}`}
    >
      {children}
    </div>
  );
};
