import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = "rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-honey focus:ring-offset-2 focus:ring-offset-coal disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-honey text-coal hover:bg-honey/90",
    secondary: "bg-ember text-white hover:bg-ember/90",
    outline: "border border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a] hover:bg-[#1f1f1f]",
    ghost: "text-gray-400 hover:bg-[#1b1b1b] hover:text-white"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
