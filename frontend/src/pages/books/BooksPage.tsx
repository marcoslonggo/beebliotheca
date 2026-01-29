import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw, Trash2, Grid, List, Edit, Sparkles, Filter, ZoomIn, ZoomOut, RectangleVertical, RectangleHorizontal, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBook, deleteBook, listBooks, updateBook, enrichBook, getMetadataCandidate, applyMetadataCandidate, rejectMetadataCandidate, uploadBookCover } from "../../api/books";
import { getMetadataPreview, searchBooks } from "../../api/enrichment";
import { Book, MetadataCandidateField } from "../../types/book";
import { useLibrary } from "../../contexts/LibraryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button, Input, Table, Column, LoadingOverlay, Badge, Dialog, DialogFooter, Select, Textarea } from "../../components/ui";
import BookCard from "./BookCard";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";
import BookScannerDialog from "./BookScannerDialog";
import { CoverCropDialog } from "../../components/CoverCropDialog";

const BooksPage = () => {
  const navigate = useNavigate();
  const { currentLibrary, loading: libraryLoading } = useLibrary();
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    const saved = localStorage.getItem("bookViewMode");
    return (saved as "table" | "grid") || "table";
  });
  const [sortBy, setSortBy] = useState<string>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterLoanStatus, setFilterLoanStatus] = useState<string>("all");
  const [filterMetadataStatus, setFilterMetadataStatus] = useState<string>("all");
  const [filterReadingStatus, setFilterReadingStatus] = useState<string>("all");
  const [filterSeries, setFilterSeries] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("bookItemsPerPage");
    return saved ? parseInt(saved, 10) : 25;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [cardScale, setCardScale] = useState(() => {
    const saved = localStorage.getItem("bookCardScale");
    return saved ? parseFloat(saved) : 1.0;
  });
  const [cardLayout, setCardLayout] = useState<"horizontal" | "vertical">(() => {
    const saved = localStorage.getItem("bookCardLayout");
    return (saved as "horizontal" | "vertical") || "vertical";
  });
  const [groupBySeries, setGroupBySeries] = useState(() => {
    const saved = localStorage.getItem("bookGroupBySeries");
    return saved === "true";
  });
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const initialFormData = {
    title: "",
    creator: "",
    identifier: "",
    publisher: "",
    date: "",
    description: "",
    series: "",
    cover_image_url: "",
    ownership_status: "owned",
    loan_status: "available" as "available" | "loaned",
    metadata_status: "complete",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    creator: "",
    identifier: "",
    publisher: "",
    date: "",
    description: "",
    series: "",
  });

  // Metadata review dialog state
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [metadataCandidate, setMetadataCandidate] = useState<Record<string, MetadataCandidateField> | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchTerm), 350);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterLoanStatus, filterMetadataStatus, filterReadingStatus, filterSeries, search]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("bookViewMode", viewMode);
  }, [viewMode]);

  // Persist card scale to localStorage
  useEffect(() => {
    localStorage.setItem("bookCardScale", cardScale.toString());
  }, [cardScale]);

  // Persist card layout to localStorage
  useEffect(() => {
    localStorage.setItem("bookCardLayout", cardLayout);
  }, [cardLayout]);

  // Persist group by series to localStorage
  useEffect(() => {
    localStorage.setItem("bookGroupBySeries", groupBySeries.toString());
  }, [groupBySeries]);

  // Persist items per page to localStorage
  useEffect(() => {
    localStorage.setItem("bookItemsPerPage", itemsPerPage.toString());
  }, [itemsPerPage]);

  // Handle card scale change
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardScale(parseFloat(e.target.value));
  };

  // Helper functions
  const resetForm = () => {
    setFormData(initialFormData);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPreviewUrl(null);
    setSelectedCoverFile(null);
    if (coverCropSrc) {
      URL.revokeObjectURL(coverCropSrc);
    }
    setCoverCropSrc(null);
    setIsCoverCropOpen(false);
  };

  const getCoverUrl = (book: Book): string | null => {
    if (book.cover_image_url) {
      return book.cover_image_url;
    }
    if (book.cover_image_path) {
      const filename = book.cover_image_path.split(/[\\/]/).pop();
      return filename ? `/covers/${filename}` : null;
    }
    return null;
  };

  const handleScanISBN = async (isbn: string) => {
    setFormData({ ...initialFormData, identifier: isbn });
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPreviewUrl(null);
    setSelectedCoverFile(null);
    if (coverCropSrc) {
      URL.revokeObjectURL(coverCropSrc);
    }
    setCoverCropSrc(null);
    setIsCoverCropOpen(false);
    setIsScannerOpen(false);

    // Auto-search for book metadata
    if (!currentLibrary) return;

    try {
      const toString = (value: unknown) => (typeof value === "string" ? value : "");
      const toStringArray = (value: unknown) => {
        if (Array.isArray(value)) {
          return value.map((entry) => String(entry));
        }
        if (typeof value === "string") {
          return [value];
        }
        return [];
      };
      const toDescription = (value: unknown) => {
        if (typeof value === "string") return value;
        if (value && typeof value === "object" && "value" in value) {
          return String((value as { value?: unknown }).value ?? "");
        }
        return "";
      };

      let book: Record<string, unknown> | null = null;

      try {
        book = await getMetadataPreview(currentLibrary.id, isbn);
      } catch (previewError) {
        console.warn("Metadata preview failed, falling back to search:", previewError);
        const results = await searchBooks(currentLibrary.id, isbn, "auto", 1);
        if (results && results.length > 0) {
          book = results[0] as Record<string, unknown>;
        }
      }

      if (book) {
        console.log("[ISBN scan] metadata preview", book);
        const authors = toStringArray(book.authors ?? book.creator);
        const publishedDate = toString(
          book.publishedDate ?? book.date ?? book.publish_date ?? book.published_date,
        );
        const series = toString(book.series ?? book.series_name ?? book.seriesTitle);
        const coverImageUrl = toString(
          book.cover_url ?? book.coverUrl ?? book.cover_image_url ?? book.coverImageUrl,
        );

        setFormData({
          ...initialFormData,
          identifier: isbn,
          title: toString(book.title),
          creator: authors.join(", "),
          publisher: toString(book.publisher),
          date: publishedDate,
          description: toDescription(book.description),
          series,
          cover_image_url: coverImageUrl,
        });
      }
    } catch (error) {
      console.error("Failed to fetch book metadata:", error);
      // Still keep the ISBN even if search fails
    }
  };

  const handleEnrichBook = async (book: Book) => {
    if (!currentLibrary) return;

    // Check if book has an ISBN/identifier
    if (!book.identifier || book.identifier.trim() === "") {
      alert(
        "This book doesn't have an ISBN.\n\n" +
        "Please edit the book and add an ISBN (identifier) before enriching metadata.\n\n" +
        "You can find the ISBN on the back cover or copyright page of the book."
      );
      return;
    }

    // If book already has metadata awaiting review, open review dialog
    if (book.metadata_status === "awaiting_review" && book.metadata_candidate) {
      setSelectedBook(book);
      setMetadataCandidate(book.metadata_candidate);
      setSelectedFields(Object.keys(book.metadata_candidate));
      setIsReviewDialogOpen(true);
      return;
    }

    // Otherwise trigger enrichment
    try {
      await enrichMutation.mutateAsync({ libraryId: currentLibrary.id, bookId: book.id });
    } catch (error: any) {
      console.error("Failed to enrich book:", error);
      alert(`Failed to enrich book: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleReviewMetadata = async (book: Book) => {
    if (!currentLibrary) return;

    try {
      const candidate = await getMetadataCandidate(currentLibrary.id, book.id);
      setSelectedBook(book);
      setMetadataCandidate(candidate.metadata_candidate);
      setSelectedFields(candidate.metadata_candidate ? Object.keys(candidate.metadata_candidate) : []);
      setIsReviewDialogOpen(true);
    } catch (error: any) {
      console.error("Failed to get metadata candidate:", error);
      alert(`Failed to get metadata: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleApplyMetadata = async () => {
    if (!selectedBook || !currentLibrary) return;

    try {
      await applyMetadataMutation.mutateAsync({
        libraryId: currentLibrary.id,
        bookId: selectedBook.id,
        fields: selectedFields,
      });
      setIsReviewDialogOpen(false);
      setMetadataCandidate(null);
      setSelectedFields([]);
      setSelectedBook(null);
    } catch (error: any) {
      console.error("Failed to apply metadata:", error);
      alert(`Failed to apply metadata: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleRejectMetadata = async () => {
    if (!selectedBook || !currentLibrary) return;

    try {
      await rejectMetadataMutation.mutateAsync({
        libraryId: currentLibrary.id,
        bookId: selectedBook.id,
      });
      setIsReviewDialogOpen(false);
      setMetadataCandidate(null);
      setSelectedFields([]);
      setSelectedBook(null);
    } catch (error: any) {
      console.error("Failed to reject metadata:", error);
      alert(`Failed to reject metadata: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleCreateBook = async () => {
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    const payload = {
      title: formData.title,
      creator: formData.creator.split(",").map(a => a.trim()).filter(Boolean),
      subject: [],
      description: formData.description || null,
      publisher: formData.publisher || null,
      date: formData.date || null,
      identifier: formData.identifier || null,
      cover_image_url: formData.cover_image_url || null,
      language: [],
      series: formData.series || null,
      ownership_status: formData.ownership_status,
      loan_status: formData.loan_status,
      metadata_status: formData.metadata_status,
    };

    try {
      const createdBook = await createMutation.mutateAsync(payload);
      if (selectedCoverFile && currentLibrary) {
        try {
          await uploadBookCover(currentLibrary.id, createdBook.id, selectedCoverFile);
          void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
        } catch (uploadError) {
          console.error("Failed to upload cover:", uploadError);
          alert("Book created, but cover upload failed.");
        }
      }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create book:", error);
      alert("Failed to create book. Please try again.");
    }
  };

  const handleCoverFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    if (coverCropSrc) {
      URL.revokeObjectURL(coverCropSrc);
    }
    setCoverCropSrc(src);
    setIsCoverCropOpen(true);
  };

  const handleOpenEditDialog = (book: Book) => {
    setSelectedBook(book);
    setEditFormData({
      title: book.title || "",
      creator: book.creator?.join(", ") || "",
      identifier: book.identifier || "",
      publisher: book.publisher || "",
      date: book.date || "",
      description: book.description || "",
      series: book.series || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBook = async () => {
    if (!selectedBook) return;

    if (!editFormData.title.trim()) {
      alert("Title is required");
      return;
    }

    // Only include fields that are in the edit form or need to be preserved
    const payload: BookFormValues = {
      // Fields from the edit form
      title: editFormData.title,
      creator: editFormData.creator.split(",").map(a => a.trim()).filter(Boolean),
      identifier: editFormData.identifier || null,
      publisher: editFormData.publisher || null,
      date: editFormData.date || null,
      description: editFormData.description || null,
      series: editFormData.series || null,

      // Fields that must be preserved (not in edit form)
      subject: selectedBook.subject || [],
      language: selectedBook.language || [],
      ownership_status: selectedBook.ownership_status,
      condition: selectedBook.condition,
      shelf_location: selectedBook.shelf_location,
      book_type: selectedBook.book_type,
      library_notes: selectedBook.library_notes,
      loan_status: selectedBook.loan_status,
      loan_due_date: selectedBook.loan_due_date,
      cover_image_url: selectedBook.cover_image_url || undefined, // Use undefined so it won't be sent
      cover_image_path: selectedBook.cover_image_path,
      metadata_status: selectedBook.metadata_status,
      metadata_candidate: selectedBook.metadata_candidate,
      reading_status: selectedBook.reading_status,
      grade: selectedBook.grade,
      personal_notes: selectedBook.personal_notes,
    };

    try {
      await updateMutation.mutateAsync({ id: selectedBook.id, payload });
      setIsEditDialogOpen(false);
      setSelectedBook(null);
    } catch (error) {
      console.error("Failed to update book:", error);
      alert("Failed to update book. Please try again.");
    }
  };

  const handleDeleteBook = async (book?: Book) => {
    const bookToDelete = book || selectedBook;
    if (!bookToDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${bookToDelete.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(bookToDelete.id);
      setIsEditDialogOpen(false);
      setSelectedBook(null);
    } catch (error: any) {
      console.error("Failed to delete book:", error);
      alert(`Failed to delete book: ${error?.response?.data?.detail || error.message}`);
    }
  };

  // Fetch books
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["books", currentLibrary?.id, search],
    queryFn: () => {
      if (!currentLibrary) {
        throw new Error("Library not selected");
      }
      return listBooks(currentLibrary.id, { q: search });
    },
    enabled: Boolean(currentLibrary),
  });

  // Handle both array and object response formats
  const allBooks = Array.isArray(data) ? data : (data?.items || []);

  // Get unique series for filter dropdown (from all books, before filtering)
  const uniqueSeries = Array.from(new Set(allBooks.map(b => b.series).filter(Boolean))).sort();

  // Sort handler
  const handleSort = (key: string) => {
    if (sortBy === key) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortBy(key);
      setSortDirection("asc");
    }
  };

  // Apply filters
  let books = allBooks.filter((book) => {
    // Loan status filter
    if (filterLoanStatus !== "all" && book.loan_status !== filterLoanStatus) {
      return false;
    }

    // Metadata status filter
    if (filterMetadataStatus !== "all" && book.metadata_status !== filterMetadataStatus) {
      return false;
    }

    // Reading status filter
    if (filterReadingStatus !== "all") {
      if (filterReadingStatus === "unread" && book.reading_status !== null && book.reading_status !== "unread") {
        return false;
      }
      if (filterReadingStatus !== "unread" && book.reading_status !== filterReadingStatus) {
        return false;
      }
    }

    // Series filter
    if (filterSeries !== "all" && book.series !== filterSeries) {
      return false;
    }

    return true;
  });

  // Apply sorting
  books = [...books].sort((a, b) => {
    let aVal: any = a[sortBy as keyof Book];
    let bVal: any = b[sortBy as keyof Book];

    // Handle arrays (like creator)
    if (Array.isArray(aVal)) aVal = aVal.join(", ").toLowerCase();
    if (Array.isArray(bVal)) bVal = bVal.join(", ").toLowerCase();

    // Handle nullish values
    if (aVal == null) aVal = "";
    if (bVal == null) bVal = "";

    // Convert to strings for comparison if not already
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    // Compare
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Group books by series if enabled
  const toggleSeriesCollapse = (seriesName: string) => {
    const newCollapsed = new Set(collapsedSeries);
    if (newCollapsed.has(seriesName)) {
      newCollapsed.delete(seriesName);
    } else {
      newCollapsed.add(seriesName);
    }
    setCollapsedSeries(newCollapsed);
  };

  // Pagination calculations
  const totalBooks = books.length;
  const totalPages = Math.ceil(totalBooks / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBooks = books.slice(startIndex, endIndex);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (values: any) => {
      if (!currentLibrary) {
        throw new Error("Library not selected");
      }
      return createBook(currentLibrary.id, values);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => {
      if (!currentLibrary) {
        throw new Error("Library not selected");
      }
      return updateBook(currentLibrary.id, id, payload);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!currentLibrary) {
        throw new Error("Library not selected");
      }
      return deleteBook(currentLibrary.id, id);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Enrich mutation
  const enrichMutation = useMutation({
    mutationFn: ({ libraryId, bookId }: { libraryId: string; bookId: string }) => {
      return enrichBook(libraryId, bookId);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Apply metadata mutation
  const applyMetadataMutation = useMutation({
    mutationFn: ({ libraryId, bookId, fields }: { libraryId: string; bookId: string; fields: string[] }) => {
      return applyMetadataCandidate(libraryId, bookId, fields);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Reject metadata mutation
  const rejectMetadataMutation = useMutation({
    mutationFn: ({ libraryId, bookId }: { libraryId: string; bookId: string }) => {
      return rejectMetadataCandidate(libraryId, bookId);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Calculate stats (from all books, not filtered)
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const booksAddedThisMonth = allBooks.filter(b => {
    const createdDate = new Date(b.created_at);
    return createdDate >= oneMonthAgo;
  }).length;

  // Calculate metadata quality (percentage with complete metadata)
  const completeMetadata = allBooks.filter(b => b.metadata_status === "complete").length;
  const metadataQuality = allBooks.length > 0
    ? Math.round((completeMetadata / allBooks.length) * 100)
    : 0;

  const stats = {
    total: allBooks.length,
    addedThisMonth: booksAddedThisMonth,
    loaned: allBooks.filter(b => b.loan_status === "loaned").length,
    // Note: We don't have loan due dates in the current schema, so using a placeholder
    dueSoon: 0, // TODO: Implement when loan due dates are available
    metadataQuality: metadataQuality,
    pendingEnrichment: allBooks.filter(b =>
      b.metadata_status === "pending" ||
      b.metadata_status === "enriching" ||
      b.metadata_status === "awaiting_review" ||
      b.metadata_status === "failed"
    ).length,
  };

  // Table columns
  const columns: Column<Book>[] = [
    {
      key: "cover",
      header: "Cover",
      width: "80px",
      render: (book) => {
        const coverUrl = getCoverUrl(book);
        return (
          <div className="flex items-center justify-center">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={book.title}
                className="w-10 h-14 object-cover rounded shadow-sm"
              />
            ) : (
              <BookCoverPlaceholder
                title={book.title}
                width={40}
                height={56}
                variant="card"
              />
            )}
          </div>
        );
      },
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (book) => (
        <div>
          <div className="font-medium">{book.title}</div>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Author(s)",
      width: "200px",
      sortable: true,
      render: (book) => book.creator?.join(", ") || "—",
    },
    {
      key: "series",
      header: "Series",
      width: "150px",
      sortable: true,
      render: (book) => book.series || "—",
    },
    {
      key: "metadata_status",
      header: "Metadata",
      width: "120px",
      render: (book) => {
        const getVariant = (status: string): "default" | "success" | "warning" | "error" => {
          switch (status) {
            case "complete":
              return "success";
            case "failed":
              return "error";
            case "enriching":
            case "awaiting_review":
            case "pending":
              return "warning";
            default:
              return "default";
          }
        };
        return (
          <Badge variant={getVariant(book.metadata_status)}>
            {book.metadata_status}
          </Badge>
        );
      },
    },
    {
      key: "loan_status",
      header: "Loan",
      width: "120px",
      render: (book) => (
        <Badge variant={book.loan_status === "loaned" ? "warning" : "success"}>
          {book.loan_status === "loaned" ? "Loaned" : "Available"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "120px",
      render: (book) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditDialog(book);
            }}
            className={`p-1.5 rounded transition-colors ${
              darkMode
                ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-honey"
                : "hover:bg-gray-100 text-gray-600 hover:text-honey"
            }`}
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEnrichBook(book);
            }}
            className={`p-1.5 rounded transition-colors ${
              darkMode
                ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-honey"
                : "hover:bg-gray-100 text-gray-600 hover:text-honey"
            }`}
            title="Enrich Metadata"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBook(book);
            }}
            className={`p-1.5 rounded transition-colors ${
              darkMode
                ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-[#C47978]"
                : "hover:bg-gray-100 text-gray-600 hover:text-[#C47978]"
            }`}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (libraryLoading) {
    return <LoadingOverlay message="Loading library..." />;
  }

  if (!currentLibrary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Please select a library</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load books</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? "bg-coal" : "bg-gray-50"} min-h-full`}>
      {/* Header */}
      <div className="mb-6">
        <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          CATALOG
        </p>
        <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Your Books
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Books */}
        <div
          className={`rounded-lg p-5 ${
            darkMode ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-white border border-gray-200"
          }`}
        >
          <h3 className={`text-xs font-medium mb-3 uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            TOTAL BOOKS
          </h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {stats.total}
            </span>
            {stats.addedThisMonth > 0 && (
              <span className="text-sm font-medium text-honey">
                +{stats.addedThisMonth} this month
              </span>
            )}
          </div>
        </div>

        {/* Currently Loaned */}
        <div
          className={`rounded-lg p-5 ${
            darkMode ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-white border border-gray-200"
          }`}
        >
          <h3 className={`text-xs font-medium mb-3 uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            LOANED
          </h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {stats.loaned}
            </span>
            {stats.dueSoon > 0 && (
              <span className="text-sm font-medium text-ember">
                {stats.dueSoon} due this week
              </span>
            )}
          </div>
        </div>

        {/* Metadata Quality */}
        <div
          className={`rounded-lg p-5 ${
            darkMode ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-white border border-gray-200"
          }`}
        >
          <h3 className={`text-xs font-medium mb-3 uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            METADATA QUALITY
          </h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {stats.metadataQuality}%
            </span>
            <span className={`text-sm font-medium ${
              stats.metadataQuality >= 90 ? "text-green-500" :
              stats.metadataQuality >= 70 ? "text-yellow-500" :
              "text-red-500"
            }`}>
              {stats.metadataQuality >= 90 ? "high fidelity" :
               stats.metadataQuality >= 70 ? "good" :
               "needs work"}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Card Layout & Size Controls - Only show in grid view */}
          {viewMode === "grid" && (
            <>
              {/* Layout Toggle */}
              <div className="flex gap-1">
                <Button
                  onClick={() => setCardLayout("vertical")}
                  variant={cardLayout === "vertical" ? "primary" : "outline"}
                  className="px-3"
                  title="Vertical Cards"
                >
                  <RectangleVertical className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setCardLayout("horizontal")}
                  variant={cardLayout === "horizontal" ? "primary" : "outline"}
                  className="px-3"
                  title="Horizontal Cards"
                >
                  <RectangleHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Card Size Slider */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
              }`}>
                <ZoomOut className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.25"
                  value={cardScale}
                  onChange={handleScaleChange}
                  className="w-24 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-honey"
                  title={`Card Size: ${Math.round(cardScale * 100)}%`}
                />
                <ZoomIn className="w-4 h-4 text-gray-400" />
              </div>
            </>
          )}

          {/* View Toggle */}
          <div className="flex gap-1">
            <Button
              onClick={() => setViewMode("grid")}
              variant={viewMode === "grid" ? "primary" : "outline"}
              className="px-3"
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setViewMode("table")}
              variant={viewMode === "table" ? "primary" : "outline"}
              className="px-3"
              title="Table View"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Group by Series Toggle */}
          <Button
            onClick={() => setGroupBySeries(!groupBySeries)}
            variant={groupBySeries ? "primary" : "outline"}
            title="Group by Series"
          >
            <Layers className="w-4 h-4 mr-2" />
            Group by Series
          </Button>

          {/* Add Book Button */}
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-honey hover:bg-honey/90 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Book
          </Button>

          {/* Filters Button - Moved to the right */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "primary" : "outline"}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowFilters(false)}
          />

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-96 z-50 shadow-2xl transform transition-all duration-300 ease-out animate-slide-in-right ${
              darkMode ? "bg-[#141414]" : "bg-white"
            }`}
          >
            {/* Drawer Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? "border-[#2a2a2a]" : "border-gray-200"
            }`}>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-honey" />
                <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Filters
                </h2>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? "hover:bg-[#2a2a2a] text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-140px)]">
              <div className="space-y-6">
                <Select
                  label="Loan Status"
                  value={filterLoanStatus}
                  onChange={(e) => setFilterLoanStatus(e.target.value)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "available", label: "Available" },
                    { value: "loaned", label: "Loaned" },
                  ]}
                />
                <Select
                  label="Metadata Status"
                  value={filterMetadataStatus}
                  onChange={(e) => setFilterMetadataStatus(e.target.value)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "complete", label: "Complete" },
                    { value: "pending", label: "Pending" },
                    { value: "enriching", label: "Enriching" },
                    { value: "awaiting_review", label: "Awaiting Review" },
                    { value: "failed", label: "Failed" },
                  ]}
                />
                <Select
                  label="Reading Status"
                  value={filterReadingStatus}
                  onChange={(e) => setFilterReadingStatus(e.target.value)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "unread", label: "Unread" },
                    { value: "reading", label: "Reading" },
                    { value: "read", label: "Read" },
                  ]}
                />
                <Select
                  label="Series"
                  value={filterSeries}
                  onChange={(e) => setFilterSeries(e.target.value)}
                  options={[
                    { value: "all", label: "All Series" },
                    ...uniqueSeries.map((series) => ({
                      value: series,
                      label: series,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* Drawer Footer */}
            {(filterLoanStatus !== "all" ||
              filterMetadataStatus !== "all" ||
              filterReadingStatus !== "all" ||
              filterSeries !== "all") && (
              <div className={`absolute bottom-0 left-0 right-0 p-6 border-t ${
                darkMode ? "border-[#2a2a2a] bg-[#141414]" : "border-gray-200 bg-white"
              }`}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterLoanStatus("all");
                    setFilterMetadataStatus("all");
                    setFilterReadingStatus("all");
                    setFilterSeries("all");
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Books View */}
      {viewMode === "table" ? (
        <div
          className={`rounded-xl border ${
            darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
          } overflow-hidden`}
        >
          {groupBySeries ? (
            // Custom rendering with series grouping
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingOverlay message="Loading books..." />
                </div>
              ) : paginatedBooks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                    No books found. Add your first book to get started!
                  </p>
                </div>
              ) : (
                (() => {
                  // Group paginated books by series
                  const grouped = new Map<string, Book[]>();
                  paginatedBooks.forEach(book => {
                    const seriesName = book.series || "No Series";
                    if (!grouped.has(seriesName)) {
                      grouped.set(seriesName, []);
                    }
                    grouped.get(seriesName)!.push(book);
                  });

                  return Array.from(grouped.entries()).map(([seriesName, seriesBooks]) => {
                    const isCollapsed = collapsedSeries.has(seriesName);
                    // Get series metadata from first book (all books in group have same series)
                    const seriesMetadata = seriesBooks[0]?.series_obj;

                    return (
                      <div key={seriesName} className={`border-b ${darkMode ? "border-[#2a2a2a]" : "border-gray-200"} last:border-b-0`}>
                        {/* Series Header */}
                        <button
                          onClick={() => toggleSeriesCollapse(seriesName)}
                          className={`w-full flex flex-col items-start gap-2 p-4 transition-colors ${
                            darkMode
                              ? "hover:bg-[#2a2a2a] bg-[#1a1a1a]"
                              : "hover:bg-gray-50 bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5 text-honey flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-honey flex-shrink-0" />
                            )}
                            <div className="flex items-center gap-3 flex-1 text-left">
                              <span className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
                                {seriesName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm px-2 py-0.5 rounded-full ${
                                  darkMode ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-200 text-gray-600"
                                }`}>
                                  {seriesBooks.length} {seriesBooks.length === 1 ? "book" : "books"}
                                </span>
                                {seriesMetadata?.publication_status && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    seriesMetadata.publication_status === "finished"
                                      ? darkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                                      : darkMode ? "bg-ember/20 text-ember" : "bg-orange-100 text-orange-700"
                                  }`}>
                                    {seriesMetadata.publication_status === "finished" ? "Complete" : "In Progress"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {seriesMetadata?.description && (
                            <p className={`text-sm ml-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                              {seriesMetadata.description}
                            </p>
                          )}
                        </button>

                        {/* Books in this series */}
                        {!isCollapsed && (
                          <Table
                            columns={columns}
                            data={seriesBooks}
                            keyField="id"
                            loading={false}
                            emptyMessage=""
                            onRowClick={(book) => navigate(`/books/${book.id}`)}
                            sortBy={sortBy}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className="border-0"
                          />
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          ) : (
            // Normal table view without grouping
            <Table
              columns={columns}
              data={paginatedBooks}
              keyField="id"
              loading={isLoading}
              emptyMessage="No books found. Add your first book to get started!"
              onRowClick={(book) => navigate(`/books/${book.id}`)}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
        </div>
      ) : (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingOverlay message="Loading books..." />
            </div>
          ) : totalBooks === 0 ? (
            <div
              className={`rounded-xl border ${
                darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
              } p-12 text-center`}
            >
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                No books found. Add your first book to get started!
              </p>
            </div>
          ) : groupBySeries ? (
            // Grid view with series grouping - show series as cards
            <div
              className="grid gap-5"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${cardScale * 250}px, 1fr))`
              }}
            >
              {(() => {
                // Group paginated books by series
                const grouped = new Map<string, Book[]>();
                paginatedBooks.forEach(book => {
                  const seriesName = book.series || "No Series";
                  if (!grouped.has(seriesName)) {
                    grouped.set(seriesName, []);
                  }
                  grouped.get(seriesName)!.push(book);
                });

                return Array.from(grouped.entries()).map(([seriesName, seriesBooks]) => {
                  const seriesMetadata = seriesBooks[0]?.series_obj;

                  // Debug: Log series metadata
                  console.log('Series:', seriesName, 'Metadata:', seriesMetadata);

                  const customCoverUrl = seriesMetadata?.custom_cover_path
                    ? `/covers/${seriesMetadata.custom_cover_path}`
                    : null;
                  const seriesCoverBook = seriesMetadata?.cover_book_id
                    ? seriesBooks.find(b => b.book_id === seriesMetadata.cover_book_id)
                    : null;
                  const fallbackBook = seriesCoverBook ?? seriesBooks[0];
                  const seriesCoverUrl = customCoverUrl
                    ? customCoverUrl
                    : fallbackBook
                      ? getCoverUrl(fallbackBook)
                      : null;

                  // Only make clickable if we have series metadata (real series, not "No Series")
                  const isClickable = seriesMetadata !== null && seriesMetadata !== undefined;

                  return (
                    <div
                      key={seriesName}
                      onClick={() => {
                        if (isClickable) {
                          const params = new URLSearchParams();
                          if (seriesMetadata?.id) {
                            params.set("seriesId", String(seriesMetadata.id));
                          }
                          params.set("seriesName", seriesName);
                          navigate(`/series?${params.toString()}`);
                        }
                      }}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        isClickable ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        darkMode
                          ? `bg-[#1a1a1a] border-[#2a2a2a] ${isClickable ? 'hover:border-honey/50 hover:shadow-lg hover:shadow-honey/10' : ''}`
                          : `bg-white border-gray-200 ${isClickable ? 'hover:border-honey hover:shadow-lg' : ''}`
                      }`}
                    >
                      {/* Series Cover */}
                      <div className={`h-64 flex items-center justify-center ${
                        darkMode ? "bg-[#0a0a0a]" : "bg-gray-50"
                      }`}>
                        {seriesCoverUrl ? (
                          <img
                            src={seriesCoverUrl}
                            alt={seriesName}
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className={`text-6xl font-bold ${
                            darkMode ? "text-gray-700" : "text-gray-300"
                          }`}>
                            {seriesName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Series Info */}
                      <div className="p-4 space-y-2">
                        {/* Series Name */}
                        <h3 className={`font-semibold text-lg line-clamp-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}>
                          {seriesName}
                        </h3>

                        {/* Description - Always show if available */}
                        {seriesMetadata?.description && seriesMetadata.description.trim() && (
                          <p className={`text-sm line-clamp-2 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}>
                            {seriesMetadata.description}
                          </p>
                        )}

                        {/* Debug info */}
                        {seriesMetadata && (
                          <div className="text-xs text-gray-500">
                            <div>Has description: {seriesMetadata.description ? 'YES' : 'NO'}</div>
                            <div>Publication status: {seriesMetadata.publication_status || 'NONE'}</div>
                            <div>ID: {seriesMetadata.id}</div>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Book Count */}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode ? "bg-[#2a2a2a] text-gray-400" : "bg-gray-100 text-gray-600"
                          }`}>
                            {seriesBooks.length} {seriesBooks.length === 1 ? "book" : "books"}
                          </span>

                          {/* Publication Status */}
                          {seriesMetadata && seriesMetadata.publication_status && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              seriesMetadata.publication_status === "finished"
                                ? darkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                                : darkMode ? "bg-ember/20 text-ember" : "bg-orange-100 text-orange-700"
                            }`}>
                              {seriesMetadata.publication_status === "finished" ? "Complete" : "In Progress"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            // Normal grid view without grouping
            <div
              className="grid gap-5"
              style={{
                gridTemplateColumns: cardLayout === "vertical"
                  ? `repeat(auto-fill, minmax(${cardScale * 200}px, 1fr))`
                  : `repeat(auto-fill, minmax(${cardScale * 400}px, 1fr))`
              }}
            >
              {paginatedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  coverUrl={getCoverUrl(book)}
                  layout={cardLayout}
                  onClick={() => navigate(`/books/${book.id}`)}
                  onEdit={() => handleOpenEditDialog(book)}
                  onDelete={() => handleDeleteBook(book)}
                  onEnrich={() => handleEnrichBook(book)}
                  onReview={() => handleReviewMetadata(book)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalBooks > 0 && (
        <div className="mt-6 space-y-4">
          {/* Pagination Info */}
          <div className="text-center">
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Showing {startIndex + 1}-{Math.min(endIndex, totalBooks)} of {totalBooks} book
              {totalBooks !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first 2, last 2, and 2 around current page
                const showPage =
                  page <= 2 ||
                  page > totalPages - 2 ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis
                  if (page === 3 && currentPage > 4) {
                    return (
                      <span key={page} className={darkMode ? "text-gray-500" : "text-gray-400"}>
                        ...
                      </span>
                    );
                  }
                  if (page === totalPages - 2 && currentPage < totalPages - 3) {
                    return (
                      <span key={page} className={darkMode ? "text-gray-500" : "text-gray-400"}>
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                );
              })}

              {/* Next Button */}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>

              {/* Items per page selector */}
              <div className="ml-4">
                <Select
                  value={String(itemsPerPage)}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page
                  }}
                  options={[
                    { value: "10", label: "10 per page" },
                    { value: "25", label: "25 per page" },
                    { value: "50", label: "50 per page" },
                    { value: "100", label: "100 per page" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Book Dialog */}
      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
        title="Add New Book"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            {coverPreviewUrl ? (
              <img
                src={coverPreviewUrl}
                alt="Selected cover"
                className="h-40 w-28 rounded-md object-cover shadow"
              />
            ) : formData.cover_image_url ? (
              <img
                src={formData.cover_image_url}
                alt={formData.title || "Book cover"}
                className="h-40 w-28 rounded-md object-cover shadow"
              />
            ) : (
              <div className={`h-40 w-28 rounded-md border ${darkMode ? "border-[#2a2a2a] bg-[#121212]" : "border-gray-200 bg-gray-50"} flex items-center justify-center`}>
                <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>No cover</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {coverPreviewUrl
                  ? "Using your selected cover."
                  : formData.cover_image_url
                    ? "Cover fetched from metadata."
                    : "No cover was retrieved."}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCoverFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreviewUrl ? "Replace Cover Photo" : "Take/Choose Cover Photo"}
              </Button>
              {coverPreviewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (coverPreviewUrl) {
                      URL.revokeObjectURL(coverPreviewUrl);
                    }
                    setCoverPreviewUrl(null);
                    setSelectedCoverFile(null);
                  }}
                >
                  Clear Selected Photo
                </Button>
              )}
            </div>
          </div>
          {/* Title */}
          <Input
            label="Title *"
            placeholder="Enter book title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Authors */}
          <Input
            label="Authors"
            placeholder="Enter authors separated by commas"
            value={formData.creator}
            onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
          />

          {/* ISBN and Publisher Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                ISBN
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="978-0-123456-78-9"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3"
                  title="Scan Barcode"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Input
              label="Publisher"
              placeholder="Publisher name"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            />
          </div>

          {/* Published Date */}
          <Input
            label="Published Date"
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          {/* Series */}
          <Input
            label="Series"
            placeholder="Enter series name (optional)"
            value={formData.series}
            onChange={(e) => setFormData({ ...formData, series: e.target.value })}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Enter book description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateBook}
            disabled={createMutation.isPending || !formData.title.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Create Book"}
          </Button>
        </DialogFooter>
      </Dialog>

      <CoverCropDialog
        open={isCoverCropOpen}
        imageSrc={coverCropSrc}
        onCancel={() => {
          if (coverCropSrc) {
            URL.revokeObjectURL(coverCropSrc);
          }
          setCoverCropSrc(null);
          setIsCoverCropOpen(false);
          if (coverInputRef.current) {
            coverInputRef.current.value = "";
          }
        }}
        onConfirm={(blob, previewUrl) => {
          if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
          }
          if (coverCropSrc) {
            URL.revokeObjectURL(coverCropSrc);
          }
          const file = new File([blob], "cover.jpg", { type: blob.type });
          setSelectedCoverFile(file);
          setCoverPreviewUrl(previewUrl);
          setCoverCropSrc(null);
          setIsCoverCropOpen(false);
          if (coverInputRef.current) {
            coverInputRef.current.value = "";
          }
        }}
      />

      {/* Edit Book Dialog */}
      <Dialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedBook(null);
        }}
        title="Edit Book"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Title */}
          <Input
            label="Title *"
            placeholder="Enter book title"
            value={editFormData.title}
            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
          />

          {/* Authors */}
          <Input
            label="Authors"
            placeholder="Enter authors separated by commas"
            value={editFormData.creator}
            onChange={(e) => setEditFormData({ ...editFormData, creator: e.target.value })}
          />

          {/* ISBN and Publisher Row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ISBN"
              placeholder="978-0-123456-78-9"
              value={editFormData.identifier}
              onChange={(e) => setEditFormData({ ...editFormData, identifier: e.target.value })}
            />
            <Input
              label="Publisher"
              placeholder="Publisher name"
              value={editFormData.publisher}
              onChange={(e) => setEditFormData({ ...editFormData, publisher: e.target.value })}
            />
          </div>

          {/* Published Date */}
          <Input
            label="Published Date"
            placeholder="YYYY-MM-DD"
            value={editFormData.date}
            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
          />

          {/* Series */}
          <Input
            label="Series"
            placeholder="Enter series name (optional)"
            value={editFormData.series}
            onChange={(e) => setEditFormData({ ...editFormData, series: e.target.value })}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Enter book description (optional)"
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            rows={4}
          />
        </div>

        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button
              variant="outline"
              onClick={() => handleDeleteBook()}
              disabled={deleteMutation.isPending}
              className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedBook(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBook}
                disabled={updateMutation.isPending || !editFormData.title.trim()}
              >
                {updateMutation.isPending ? "Updating..." : "Update Book"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Metadata Review Dialog */}
      <Dialog
        isOpen={isReviewDialogOpen}
        onClose={() => {
          setIsReviewDialogOpen(false);
          setMetadataCandidate(null);
          setSelectedFields([]);
          setSelectedBook(null);
        }}
        title="Review Metadata"
        maxWidth="xl"
      >
        {metadataCandidate && (
          <div className="space-y-4">
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Select the fields you want to apply from the enriched metadata:
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(metadataCandidate).map(([field, data]) => {
                const isSelected = selectedFields.includes(field);
                return (
                  <div
                    key={field}
                    className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      darkMode
                        ? isSelected
                          ? "border-honey bg-[#2a2a2a]"
                          : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                        : isSelected
                        ? "border-honey bg-honey/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedFields((prev) =>
                        prev.includes(field)
                          ? prev.filter((f) => f !== field)
                          : [...prev, field]
                      );
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 accent-honey"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium mb-2 capitalize ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {field.replace(/_/g, " ")}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className={`text-xs font-medium mb-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                              Current
                            </div>
                            <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {data.current != null
                                ? Array.isArray(data.current)
                                  ? (data.current as string[]).join(", ") || "—"
                                  : String(data.current)
                                : "—"}
                            </div>
                          </div>
                          <div>
                            <div className={`text-xs font-medium mb-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                              Suggested
                            </div>
                            <div className={`text-sm font-medium ${darkMode ? "text-honey" : "text-honey"}`}>
                              {data.suggested != null
                                ? Array.isArray(data.suggested)
                                  ? (data.suggested as string[]).join(", ") || "—"
                                  : String(data.suggested)
                                : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button
              variant="outline"
              onClick={handleRejectMetadata}
              disabled={rejectMetadataMutation.isPending}
              className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {rejectMetadataMutation.isPending ? "Rejecting..." : "Reject All"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReviewDialogOpen(false);
                  setMetadataCandidate(null);
                  setSelectedFields([]);
                  setSelectedBook(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyMetadata}
                disabled={applyMetadataMutation.isPending || selectedFields.length === 0}
              >
                {applyMetadataMutation.isPending
                  ? "Applying..."
                  : `Apply Selected (${selectedFields.length})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Barcode Scanner */}
      <BookScannerDialog
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleScanISBN}
      />
    </div>
  );
};

export default BooksPage;
