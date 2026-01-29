import { Bookmark, Edit2, Trash2, Info, Sparkles } from "lucide-react";
import { Book } from "../../types/book";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";
import { useTheme } from "../../contexts/ThemeContext";

interface BookCardProps {
  book: Book;
  coverUrl: string | null;
  layout?: "horizontal" | "vertical";
  onClick?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEnrich: () => void;
  onReview?: () => void;
}

const BookCard = ({ book, coverUrl, layout = "vertical", onClick, onEdit, onDelete, onEnrich, onReview }: BookCardProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit();
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete();
  };

  const handleInfo = (event: React.MouseEvent) => {
    event.stopPropagation();
    // TODO: Show info dialog with book details
    console.log("Show info for:", book.title);
  };

  const handleBookmark = (event: React.MouseEvent) => {
    event.stopPropagation();
    // TODO: Toggle bookmark/favorite
    console.log("Toggle bookmark for:", book.title);
  };

  const handleEnrich = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEnrich();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  };

  // Get reading status badge info
  const getReadingStatusBadge = () => {
    const status = book.reading_status;
    if (!status || status === "unread") {
      return { label: "TO READ", color: "bg-blue-500/10 text-blue-400 border-blue-500/40" };
    }
    if (status === "reading") {
      return { label: "READING", color: "bg-green-500/10 text-green-400 border-green-500/40" };
    }
    if (status === "read") {
      return { label: "READ", color: "bg-purple-500/10 text-purple-400 border-purple-500/40" };
    }
    return null;
  };

  // Get ownership status badge
  const getOwnershipBadge = () => {
    if (book.ownership_status === "owned") {
      return { label: "OWNED", color: darkMode ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-100 text-gray-700 border-gray-300" };
    }
    if (book.ownership_status === "wishlist") {
      return { label: "WANTED", color: "bg-pink-500/10 text-pink-400 border-pink-500/40" };
    }
    return null;
  };

  // Get loan status badge
  const getLoanBadge = () => {
    if (book.loan_status === "available") {
      return { label: "AVAILABLE", color: "bg-green-500/10 text-green-400 border-green-500/40" };
    }
    if (book.loan_status === "loaned") {
      return { label: "LOANED", color: "bg-red-500/10 text-red-400 border-red-500/40" };
    }
    return null;
  };

  // Get genre from subject array (first subject as primary genre)
  const primaryGenre = book.subject && book.subject.length > 0 ? book.subject[0].toUpperCase() : null;

  const readingBadge = getReadingStatusBadge();
  const ownershipBadge = getOwnershipBadge();
  const loanBadge = getLoanBadge();

  // VERTICAL LAYOUT (like the mockup - tall and narrow)
  if (layout === "vertical") {
    return (
      <div
        className={`relative flex flex-col rounded-xl overflow-hidden transition-all shadow-md ${
          darkMode ? "bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:shadow-xl" : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-2xl"
        } ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        {/* Book Cover Section - Smaller and zoomed out for vertical layout */}
        <div className="relative w-full h-64 bg-gradient-to-br from-gray-800 to-gray-900 p-3">
          {/* Genre Tag - Top Left on Cover */}
          {primaryGenre && (
            <div className="absolute top-4 left-4 z-10">
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${
                darkMode ? "bg-black/60 text-gray-200 backdrop-blur-md" : "bg-white/90 text-gray-800 backdrop-blur-md shadow-sm"
              }`}>
                {primaryGenre}
              </span>
            </div>
          )}

          {/* Info Icon - Top Right on Cover */}
          <button
            onClick={handleInfo}
            className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              darkMode ? "bg-black/60 text-gray-300 hover:bg-black/80 hover:text-honey backdrop-blur-md" : "bg-white/90 text-gray-600 hover:bg-white hover:text-honey backdrop-blur-md shadow-sm"
            }`}
            title="Book Information"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Cover Image */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookCoverPlaceholder
                title={book.title}
                width={180}
                height={240}
                variant="card"
              />
            </div>
          )}
        </div>

        {/* Book Details Section */}
        <div className="flex flex-col flex-1 p-4">
          {/* Title */}
          <h3 className={`font-bold text-base mb-1 line-clamp-2 leading-tight ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            {book.title}
          </h3>

          {/* Author */}
          <p className={`text-sm mb-3 line-clamp-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {book.creator && book.creator.length > 0 ? book.creator.join(", ") : "Unknown Author"}
          </p>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {loanBadge && (
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${loanBadge.color}`}>
                {loanBadge.label}
              </span>
            )}
            {readingBadge && (
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${readingBadge.color}`}>
                {readingBadge.label}
              </span>
            )}
            {ownershipBadge && (
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${ownershipBadge.color}`}>
                {ownershipBadge.label}
              </span>
            )}
          </div>

          {/* ISBN */}
          {book.identifier && (
            <p className={`text-[11px] font-semibold mb-0.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <span className="font-bold">ISBN</span> {book.identifier}
            </p>
          )}

          {/* Added Date */}
          <p className={`text-[11px] font-semibold mb-auto pb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Added {formatDate(book.created_at)}
          </p>

          {/* Action Icons and Updated Date */}
          <div className={`flex items-center gap-3 pt-3 border-t ${darkMode ? "border-[#2a2a2a]" : "border-gray-200"}`}>
            <button
              onClick={handleBookmark}
              className={`transition-colors ${
                darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
              }`}
              title="Bookmark"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={handleEdit}
              className={`transition-colors ${
                darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
              }`}
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleEnrich}
              className={`transition-colors ${
                darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
              }`}
              title="Enrich Metadata"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className={`transition-colors ${
                darkMode ? "text-gray-500 hover:text-ember" : "text-gray-400 hover:text-ember"
              }`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Updated Date - Right Aligned */}
            <p className={`text-[10px] ml-auto ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
              Updated {formatDate(book.updated_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // HORIZONTAL LAYOUT (side-by-side)
  return (
    <div
      className={`relative flex rounded-xl overflow-hidden transition-all shadow-md ${
        darkMode ? "bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:shadow-xl" : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-2xl"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Book Cover Section - Smaller for horizontal layout */}
      <div className="relative w-32 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 p-2">
        {/* Genre Tag - Top Left on Cover */}
        {primaryGenre && (
          <div className="absolute top-3 left-3 z-10">
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded ${
              darkMode ? "bg-black/60 text-gray-200 backdrop-blur-md" : "bg-white/90 text-gray-800 backdrop-blur-md shadow-sm"
            }`}>
              {primaryGenre}
            </span>
          </div>
        )}

        {/* Cover Image */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookCoverPlaceholder
              title={book.title}
              width={120}
              height={160}
              variant="card"
            />
          </div>
        )}
      </div>

      {/* Book Details Section */}
      <div className="flex flex-col flex-1 p-4 min-w-0">
        {/* Header with Title and Info Icon */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`font-bold text-lg mb-1 line-clamp-1 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              {book.title}
            </h3>

            {/* Author */}
            <p className={`text-sm line-clamp-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {book.creator && book.creator.length > 0 ? book.creator.join(", ") : "Unknown Author"}
            </p>
          </div>

          {/* Info Icon */}
          <button
            onClick={handleInfo}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              darkMode ? "bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-honey" : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-honey"
            }`}
            title="Book Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {loanBadge && (
            <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md border ${loanBadge.color}`}>
              {loanBadge.label}
            </span>
          )}
          {readingBadge && (
            <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md border ${readingBadge.color}`}>
              {readingBadge.label}
            </span>
          )}
          {ownershipBadge && (
            <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md border ${ownershipBadge.color}`}>
              {ownershipBadge.label}
            </span>
          )}
        </div>

        {/* ISBN and Date */}
        <div className="flex gap-4 mb-auto">
          {book.identifier && (
            <p className={`text-xs font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <span className="font-bold">ISBN</span> {book.identifier}
            </p>
          )}
          <p className={`text-xs font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Added {formatDate(book.created_at)}
          </p>
        </div>

        {/* Action Icons and Updated Date */}
        <div className={`flex items-center gap-4 pt-3 mt-3 border-t ${darkMode ? "border-[#2a2a2a]" : "border-gray-200"}`}>
          <button
            onClick={handleBookmark}
            className={`transition-colors ${
              darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
            }`}
            title="Bookmark"
          >
            <Bookmark className="w-5 h-5" />
          </button>
          <button
            onClick={handleEdit}
            className={`transition-colors ${
              darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
            }`}
            title="Edit"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleEnrich}
            className={`transition-colors ${
              darkMode ? "text-gray-500 hover:text-honey" : "text-gray-400 hover:text-honey"
            }`}
            title="Enrich Metadata"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className={`transition-colors ${
              darkMode ? "text-gray-500 hover:text-ember" : "text-gray-400 hover:text-ember"
            }`}
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Updated Date - Right Aligned */}
          <p className={`text-[11px] ml-auto ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
            Updated {formatDate(book.updated_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
