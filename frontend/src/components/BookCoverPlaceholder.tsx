import { useTheme } from "../contexts/ThemeContext";

interface BookCoverPlaceholderProps {
  title?: string;
  width?: number | string;
  height?: number | string;
  variant?: "card" | "avatar" | "detail";
}

const BookCoverPlaceholder = ({
  title = "No Cover",
  width = 100,
  height = 150,
  variant = "card"
}: BookCoverPlaceholderProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const firstLetter = title && title.trim() !== "No Cover" ? title.charAt(0).toUpperCase() : "";

  // Variant-specific styling
  const variantClasses = {
    card: darkMode ? "bg-gray-700 rounded" : "bg-gray-200 rounded",
    avatar: darkMode ? "bg-gray-600 rounded-lg" : "bg-gray-300 rounded-lg",
    detail: darkMode
      ? "bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg"
      : "bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
  };

  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const heightStyle = typeof height === "number" ? `${height}px` : height;
  const numericHeight = typeof height === "number" ? height : parseInt(String(height));

  return (
    <div
      className={`flex flex-col items-center justify-center overflow-hidden ${variantClasses[variant]}`}
      style={{ width: widthStyle, height: heightStyle }}
    >
      <div className="flex flex-col items-center gap-2">
        {firstLetter ? (
          <div
            className={`font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            style={{ fontSize: `${numericHeight * 0.3}px` }}
          >
            {firstLetter}
          </div>
        ) : (
          <svg
            className={darkMode ? "text-gray-500" : "text-gray-400"}
            style={{ fontSize: numericHeight * 0.4 }}
            width={numericHeight * 0.4}
            height={numericHeight * 0.4}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
          </svg>
        )}
        {variant === "detail" && (
          <p className={`text-xs text-center px-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            No Cover Available
          </p>
        )}
      </div>
    </div>
  );
};

export default BookCoverPlaceholder;
