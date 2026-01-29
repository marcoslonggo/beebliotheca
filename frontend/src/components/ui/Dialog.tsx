import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

interface DialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  scrollable?: boolean;
  contentClassName?: string;
}

export const Dialog = ({
  isOpen,
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
  showCloseButton = true,
  scrollable = true,
  contentClassName = ""
}: DialogProps) => {
  const dialogOpen = isOpen ?? open ?? false;
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full"
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialogOpen) {
        onClose();
      }
    };

    if (dialogOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [dialogOpen, onClose]);

  if (!dialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} mx-4 ${
          darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
        } border rounded-xl shadow-soft-card max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              darkMode ? "border-[#2a2a2a]" : "border-gray-200"
            }`}
          >
            {title && (
              <h2
                className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={`${scrollable ? "overflow-y-auto" : "overflow-hidden"} flex-1 px-6 py-4 ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export const DialogFooter = ({ children, className = "" }: DialogFooterProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div
      className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
        darkMode ? "border-[#2a2a2a]" : "border-gray-200"
      } ${className}`}
    >
      {children}
    </div>
  );
};
