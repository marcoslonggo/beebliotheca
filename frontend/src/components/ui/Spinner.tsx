interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3"
  };

  return (
    <div
      className={`animate-spin rounded-full border-honey border-t-transparent ${sizes[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay = ({ message = "Loading..." }: LoadingOverlayProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-400">{message}</p>
    </div>
  );
};
