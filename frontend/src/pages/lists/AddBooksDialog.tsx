import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, BookOpen } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLibrary } from "../../contexts/LibraryContext";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Spinner } from "../../components/ui/Spinner";
import { listBooks } from "../../api/books";
import { addListItem, getList } from "../../api/lists";
import { Book } from "../../types/book";

interface AddBooksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  onSuccess: () => void;
}

interface SelectedBook {
  book: Book;
  notes: string;
}

const AddBooksDialog = ({
  isOpen,
  onClose,
  listId,
  onSuccess,
}: AddBooksDialogProps) => {
  const { theme } = useTheme();
  const { currentLibrary } = useLibrary();
  const darkMode = theme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<Map<string, SelectedBook>>(new Map());
  const [globalNotes, setGlobalNotes] = useState("");

  // Fetch available books
  const {
    data: booksData,
    isLoading: isLoadingBooks,
    error: booksError,
  } = useQuery({
    queryKey: ["books", currentLibrary?.id, searchQuery],
    queryFn: () => listBooks(currentLibrary!.id, { q: searchQuery, limit: 100 }),
    enabled: !!currentLibrary && isOpen,
  });

  // Fetch current list to get max order_index
  const { data: listDetail } = useQuery({
    queryKey: ["readingList", listId],
    queryFn: () => getList(listId),
    enabled: isOpen,
  });

  // Add books mutation
  const addBooksMutation = useMutation({
    mutationFn: async () => {
      if (!currentLibrary) throw new Error("No library selected");

      const maxOrderIndex = listDetail?.items.length || 0;
      const booksToAdd = Array.from(selectedBooks.values());

      // Add books sequentially to maintain order
      for (let i = 0; i < booksToAdd.length; i++) {
        const { book, notes } = booksToAdd[i];
        const coverUrl = book.cover_image_url ?? (book.cover_image_path ? `/covers/${book.cover_image_path}` : null);

        await addListItem(listId, {
          title: book.title,
          author: book.creator?.join(", ") || null,
          isbn: book.identifier || null,
          cover_image_url: coverUrl,
          book_id: book.book_id,
          item_type: "book",
          order_index: maxOrderIndex + i,
          notes: notes || globalNotes || null,
        });
      }
    },
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
  });

  const handleClose = () => {
    setSearchQuery("");
    setSelectedBooks(new Map());
    setGlobalNotes("");
    onClose();
  };

  const handleToggleBook = (book: Book) => {
    setSelectedBooks((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(book.id)) {
        newMap.delete(book.id);
      } else {
        newMap.set(book.id, { book, notes: "" });
      }
      return newMap;
    });
  };

  const handleBookNotes = (bookId: string, notes: string) => {
    setSelectedBooks((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(bookId);
      if (existing) {
        newMap.set(bookId, { ...existing, notes });
      }
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBooks.size === 0) return;
    await addBooksMutation.mutateAsync();
  };

  const isLoading = addBooksMutation.isPending;
  const error = addBooksMutation.error;

  // Filter out books already in the list
  const existingBookIds = new Set(
    listDetail?.items
      .filter((item) => item.book_id)
      .map((item) => item.book_id)
  );
  const availableBooks = booksData?.items.filter(
    (book) => !existingBookIds.has(book.book_id)
  ) || [];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Books to List"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!currentLibrary && (
          <div
            className={`p-3 rounded-lg ${
              darkMode
                ? "bg-[#2a2a2a] border border-[#3a3a3a]"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            <p className={darkMode ? "text-gray-200 text-sm" : "text-amber-800 text-sm"}>
              Select a library to browse and add books to this list.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className={`p-3 rounded-lg ${
              darkMode
                ? "bg-red-900/20 border border-red-700/50"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p className="text-red-400 text-sm">
              {error instanceof Error ? error.message : "Failed to add books"}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          />
          <Input
            placeholder="Search books in your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!currentLibrary}
            className={`pl-10 ${
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500"
                : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
            } ${!currentLibrary ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>

        {/* Global Notes */}
        {selectedBooks.size > 0 && (
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Notes (optional - applies to all selected books)
            </label>
            <Textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              placeholder="Add notes for these books..."
              rows={2}
              className={
                darkMode
                  ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900"
              }
            />
          </div>
        )}

        {/* Books List */}
        <div
          className={`border rounded-lg overflow-hidden ${
            darkMode ? "border-[#2a2a2a]" : "border-gray-200"
          }`}
        >
          <div
            className={`p-3 border-b ${
              darkMode
                ? "bg-[#1a1a1a] border-[#2a2a2a]"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {selectedBooks.size > 0
                ? `${selectedBooks.size} book${selectedBooks.size > 1 ? "s" : ""} selected`
                : "Select books to add"}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!currentLibrary ? (
              <div
                className={`p-10 text-center ${
                  darkMode ? "bg-[#0a0a0a]" : "bg-white"
                }`}
              >
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  Choose a library first to browse available books.
                </p>
              </div>
            ) : isLoadingBooks ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
              </div>
            ) : booksError ? (
              <div className="p-4">
                <p className="text-red-400 text-sm">
                  Error loading books: {booksError instanceof Error ? booksError.message : "Unknown error"}
                </p>
              </div>
            ) : availableBooks.length === 0 ? (
              <div
                className={`p-12 text-center ${
                  darkMode ? "bg-[#0a0a0a]" : "bg-white"
                }`}
              >
                <BookOpen
                  className={`w-12 h-12 mx-auto mb-3 ${
                    darkMode ? "text-gray-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {searchQuery
                    ? "No books found"
                    : existingBookIds.size > 0
                      ? "All books in your library are already in this list"
                      : "No books in your library"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {availableBooks.map((book) => {
                  const isSelected = selectedBooks.has(book.id);

                  return (
                    <div
                      key={book.id}
                      className={`p-3 transition-colors ${
                        darkMode
                          ? isSelected
                            ? "bg-[#8CE2D0]/10"
                            : "bg-[#0a0a0a] hover:bg-[#1a1a1a]"
                          : isSelected
                            ? "bg-[#8CE2D0]/10"
                            : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleBook(book)}
                          className="mt-1 w-4 h-4 rounded border-gray-600 text-[#8CE2D0] focus:ring-[#8CE2D0] focus:ring-offset-0"
                        />

                        {(() => {
                          const coverPreview =
                            book.cover_image_url || (book.cover_image_path ? `/covers/${book.cover_image_path}` : null);
                          return coverPreview ? (
                          <div className="w-12 h-16 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                            <img
                                src={coverPreview}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          ) : null;
                        })()}

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm mb-1 ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {book.title}
                          </p>
                          {book.creator && book.creator.length > 0 && (
                            <p
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              by {book.creator.join(", ")}
                            </p>
                          )}
                          {book.identifier && (
                            <p
                              className={`text-xs mt-1 ${
                                darkMode ? "text-gray-500" : "text-gray-500"
                              }`}
                            >
                              ISBN: {book.identifier}
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
            disabled={isLoading || selectedBooks.size === 0 || !currentLibrary}
          >
            {isLoading
              ? "Adding..."
              : `Add ${selectedBooks.size} Book${selectedBooks.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default AddBooksDialog;
