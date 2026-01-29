import { ReactNode } from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Badge = ({
  children,
  variant = "default",
  size = "md",
  className = ""
}: BadgeProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const variants = {
    default: darkMode
      ? "bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]"
      : "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-green-500/10 text-green-500 border-green-500/30",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    error: "bg-red-500/10 text-red-500 border-red-500/30",
    info: "bg-honey/10 text-honey border-honey/30"
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
