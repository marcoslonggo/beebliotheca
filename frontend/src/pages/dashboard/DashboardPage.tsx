import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, BookOpen, Clock, Sparkles, TrendingUp } from "lucide-react";

import { listBooks } from "../../api/books";
import { Book } from "../../types/book";
import { useLibrary } from "../../contexts/LibraryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button, LoadingOverlay, Badge } from "../../components/ui";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { currentLibrary } = useLibrary();
  const { theme } = useTheme();
  const { user } = useAuth();
  const darkMode = theme === "dark";

  // Fetch books
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["books", currentLibrary?.id],
    queryFn: () => {
      if (!currentLibrary) throw new Error("No library selected");
      return listBooks(currentLibrary.id);
    },
    enabled: Boolean(currentLibrary),
  });

  const books = booksData?.items || [];

  // Calculate stats
  const stats = {
    total: books.length,
    loaned: books.filter((b) => b.loan_status === "loaned").length,
    pendingEnrichment: books.filter(
      (b) =>
        b.metadata_status === "pending" ||
        b.metadata_status === "enriching" ||
        b.metadata_status === "awaiting_review" ||
        b.metadata_status === "failed"
    ).length,
    reading: books.filter((b) => b.reading_status === "reading").length,
    completed: books.filter((b) => b.reading_status === "read").length,
  };

  // Recent books (last 5 added)
  const recentBooks = books
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Currently reading
  const currentlyReading = books
    .filter((b) => b.reading_status === "reading")
    .slice(0, 3);

  const getCoverUrl = (book: Book): string | null => {
    if (book.cover_image_url) return book.cover_image_url;
    if (book.cover_image_path) return `/covers/${book.cover_image_path}`;
    return null;
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading dashboard..." />;
  }

  return (
    <div className={`p-6 ${darkMode ? "bg-coal" : "bg-gray-50"} min-h-screen`}>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h1>
          <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
            {currentLibrary ? `Managing ${currentLibrary.name}` : "Select a library to get started"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Books */}
          <div
            className={`rounded-xl border-l-4 border-honey p-6 shadow-sm ${
              darkMode
                ? "bg-[#1a1a1a] border-r border-t border-b border-[#2a2a2a]"
                : "bg-white border-r border-t border-b border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium uppercase tracking-wide ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Books
              </h3>
              <BookOpen className="w-5 h-5 text-honey" />
            </div>
            <div className="text-3xl font-bold text-honey">{stats.total}</div>
          </div>

          {/* Currently Reading */}
          <div
            className={`rounded-xl border-l-4 border-blue-500 p-6 shadow-sm ${
              darkMode
                ? "bg-[#1a1a1a] border-r border-t border-b border-[#2a2a2a]"
                : "bg-white border-r border-t border-b border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium uppercase tracking-wide ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Reading
              </h3>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500">{stats.reading}</div>
          </div>

          {/* Completed */}
          <div
            className={`rounded-xl border-l-4 border-green-500 p-6 shadow-sm ${
              darkMode
                ? "bg-[#1a1a1a] border-r border-t border-b border-[#2a2a2a]"
                : "bg-white border-r border-t border-b border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium uppercase tracking-wide ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Completed
              </h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
          </div>

          {/* Pending Enrichment */}
          <div
            className={`rounded-xl border-l-4 border-yellow-500 p-6 shadow-sm ${
              darkMode
                ? "bg-[#1a1a1a] border-r border-t border-b border-[#2a2a2a]"
                : "bg-white border-r border-t border-b border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`text-sm font-medium uppercase tracking-wide ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Needs Enrichment
              </h3>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-500">{stats.pendingEnrichment}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className={`rounded-xl border p-6 mb-8 ${
            darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/books")}>
              <BookOpen className="w-4 h-4 mr-2" />
              View All Books
            </Button>
            <Button onClick={() => navigate("/books")} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add New Book
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Currently Reading */}
          {currentlyReading.length > 0 && (
            <div
              className={`rounded-xl border p-6 ${
                darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
              }`}
            >
              <h2
                className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                Currently Reading
              </h2>
              <div className="space-y-4">
                {currentlyReading.map((book) => {
                  const coverUrl = getCoverUrl(book);
                  return (
                    <div
                      key={book.id}
                      onClick={() => navigate(`/books/${book.id}`)}
                      className={`flex gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                        darkMode ? "hover:bg-[#2a2a2a]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded shadow-sm"
                          />
                        ) : (
                          <BookCoverPlaceholder
                            title={book.title}
                            width={48}
                            height={64}
                            variant="card"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold mb-1 truncate ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {book.title}
                        </h3>
                        <p className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {book.creator?.join(", ") || "Unknown Author"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recently Added */}
          <div
            className={`rounded-xl border p-6 ${
              darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
            }`}
          >
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Recently Added
            </h2>
            {recentBooks.length > 0 ? (
              <div className="space-y-4">
                {recentBooks.map((book) => {
                  const coverUrl = getCoverUrl(book);
                  return (
                    <div
                      key={book.id}
                      onClick={() => navigate(`/books/${book.id}`)}
                      className={`flex gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                        darkMode ? "hover:bg-[#2a2a2a]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded shadow-sm"
                          />
                        ) : (
                          <BookCoverPlaceholder
                            title={book.title}
                            width={48}
                            height={64}
                            variant="card"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold mb-1 truncate ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {book.title}
                        </h3>
                        <p className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {book.creator?.join(", ") || "Unknown Author"}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            variant={
                              book.metadata_status === "complete"
                                ? "success"
                                : book.metadata_status === "failed"
                                ? "error"
                                : "warning"
                            }
                          >
                            {book.metadata_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                No books yet. Add your first book to get started!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
