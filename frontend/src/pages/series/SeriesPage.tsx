import { useState, useMemo, useEffect, useRef, ChangeEvent } from "react";
import { Plus, Search, Edit, Trash2, Info, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useLibrary } from "../../contexts/LibraryContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import {
  listSeries,
  getSeries,
  getSeriesBooks,
  getSeriesReadingStatus,
  deleteSeries,
  updateSeries,
  uploadSeriesCover,
  Series,
  SeriesBook,
  SeriesReadingStatus,
} from "../../api/series";
import SeriesFormDialog from "./SeriesFormDialog";
import { useNavigate, useLocation } from "react-router-dom";

const SeriesPage = () => {
  const { theme } = useTheme();
  const { currentLibrary } = useLibrary();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [coverActionBookId, setCoverActionBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const syncUrlSelection = (series: Series | null, options?: { replace?: boolean }) => {
    const params = new URLSearchParams(location.search);
    if (series) {
      params.set("seriesId", String(series.id));
      params.set("seriesName", series.name);
    } else {
      params.delete("seriesId");
      params.delete("seriesName");
    }
    const searchString = params.toString();
    navigate(
      {
        pathname: "/series",
        search: searchString ? `?${searchString}` : "",
      },
      { replace: options?.replace ?? true },
    );
  };

  // Fetch series list
  const {
    data: seriesList = [],
    isLoading: isLoadingList,
    error: listError,
  } = useQuery({
    queryKey: ["series", currentLibrary?.id],
    queryFn: () => listSeries(currentLibrary!.id),
    enabled: !!currentLibrary,
  });

  // Fetch selected series details
  const { data: selectedSeries } = useQuery({
    queryKey: ["series", currentLibrary?.id, selectedSeriesId],
    queryFn: () => getSeries(currentLibrary!.id, selectedSeriesId!),
    enabled: !!currentLibrary && !!selectedSeriesId,
  });

  // Fetch books in selected series
  const { data: seriesBooks = [], isLoading: isLoadingBooks } = useQuery({
    queryKey: ["series", currentLibrary?.id, selectedSeriesId, "books"],
    queryFn: () => getSeriesBooks(currentLibrary!.id, selectedSeriesId!),
    enabled: !!currentLibrary && !!selectedSeriesId,
  });

  // Fetch reading status for selected series
  const { data: readingStatus } = useQuery({
    queryKey: ["series", currentLibrary?.id, selectedSeriesId, "reading-status"],
    queryFn: () => getSeriesReadingStatus(currentLibrary!.id, selectedSeriesId!),
    enabled: !!currentLibrary && !!selectedSeriesId,
  });

  // Delete series mutation
  const deleteMutation = useMutation({
    mutationFn: (seriesId: number) => deleteSeries(currentLibrary!.id, seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series", currentLibrary?.id] });
      setSelectedSeriesId(null);
      syncUrlSelection(null, { replace: true });
    },
  });

  // Filter series by search query
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return seriesList;
    const query = searchQuery.toLowerCase();
    return seriesList.filter((series) =>
      series.name.toLowerCase().includes(query)
    );
  }, [seriesList, searchQuery]);

  const invalidateSeriesData = () => {
    if (!currentLibrary) return;
    queryClient.invalidateQueries({ queryKey: ["series", currentLibrary.id] });
    if (selectedSeriesId) {
      queryClient.invalidateQueries({
        queryKey: ["series", currentLibrary.id, selectedSeriesId],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", currentLibrary.id, selectedSeriesId, "books"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", currentLibrary.id, selectedSeriesId, "reading-status"],
      });
    }
  };

  useEffect(() => {
    if (!filteredSeries.length) {
      if (selectedSeriesId !== null) {
        setSelectedSeriesId(null);
      }
      return;
    }

    const params = new URLSearchParams(location.search);
    const idParam = params.get("seriesId");
    const nameParam = params.get("seriesName");

    let matchedSeries: Series | undefined;
    if (idParam) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        matchedSeries = filteredSeries.find((series) => series.id === parsed);
      }
    }
    if (!matchedSeries && nameParam) {
      const normalized = nameParam.toLowerCase();
      matchedSeries = filteredSeries.find(
        (series) => series.name.toLowerCase() === normalized,
      );
    }

    if (matchedSeries) {
      if (matchedSeries.id !== selectedSeriesId) {
        setSelectedSeriesId(matchedSeries.id);
      }
      return;
    }

    if (selectedSeriesId === null) {
      setSelectedSeriesId(filteredSeries[0].id);
      syncUrlSelection(filteredSeries[0], { replace: true });
    }
  }, [filteredSeries, location.search, selectedSeriesId]);

  const handleSelectSeries = (series: Series) => {
    setSelectedSeriesId(series.id);
    syncUrlSelection(series, { replace: true });
  };

  const handleCreateSeries = () => {
    setEditingSeries(null);
    setIsFormDialogOpen(true);
  };

  const handleEditSeries = () => {
    if (selectedSeries) {
      setEditingSeries(selectedSeries);
      setIsFormDialogOpen(true);
    }
  };

  const handleDeleteSeries = async () => {
    if (!selectedSeries) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedSeries.name}"? Books in this series will not be deleted, but their series assignment will be removed.`
    );

    if (confirmed) {
      await deleteMutation.mutateAsync(selectedSeries.id);
    }
  };

  const handleFormClose = () => {
    setIsFormDialogOpen(false);
    setEditingSeries(null);
  };

  const handleFormSuccess = (series: Series) => {
    queryClient.invalidateQueries({ queryKey: ["series", currentLibrary?.id] });
    handleSelectSeries(series);
    handleFormClose();
  };

  const setCoverFromBookMutation = useMutation({
    mutationFn: (bookId: string) =>
      updateSeries(currentLibrary!.id, selectedSeriesId!, {
        cover_book_id: bookId,
        custom_cover_path: null,
      }),
    onSuccess: invalidateSeriesData,
  });

  const clearCoverMutation = useMutation({
    mutationFn: () =>
      updateSeries(currentLibrary!.id, selectedSeriesId!, {
        cover_book_id: null,
        custom_cover_path: null,
      }),
    onSuccess: invalidateSeriesData,
  });

  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => uploadSeriesCover(currentLibrary!.id, selectedSeriesId!, file),
    onSuccess: invalidateSeriesData,
  });

  const coverMutationPending =
    setCoverFromBookMutation.isPending ||
    clearCoverMutation.isPending ||
    uploadCoverMutation.isPending;

  const handleSetCoverFromBook = async (book: SeriesBook) => {
    if (!selectedSeriesId || !currentLibrary) return;
    try {
      setCoverActionBookId(book.book_id);
      await setCoverFromBookMutation.mutateAsync(book.book_id);
    } catch (error) {
      console.error("Failed to set series cover", error);
    } finally {
      setCoverActionBookId(null);
    }
  };

  const handleUploadCoverClick = () => {
    if (!selectedSeriesId) return;
    fileInputRef.current?.click();
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSeriesId || !currentLibrary) {
      event.target.value = "";
      return;
    }
    try {
      await uploadCoverMutation.mutateAsync(file);
    } catch (error) {
      console.error("Failed to upload series cover", error);
    } finally {
      event.target.value = "";
    }
  };

  const handleClearCover = async () => {
    if (!selectedSeriesId || !currentLibrary || (!selectedSeries?.custom_cover_path && !selectedSeries?.cover_book_id)) {
      return;
    }
    try {
      await clearCoverMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to clear series cover", error);
    }
  };

  const buildSeriesBookCoverUrl = (book: SeriesBook): string | null => {
    if (book.cover_image_url) return book.cover_image_url;
    if (book.cover_image_path) return `/covers/${book.cover_image_path}`;
    return null;
  };

  const coverBook = useMemo(() => {
    if (!selectedSeries?.cover_book_id) return null;
    return seriesBooks.find((book) => book.book_id === selectedSeries.cover_book_id) ?? null;
  }, [selectedSeries, seriesBooks]);

  const currentCoverUrl = useMemo(() => {
    if (!selectedSeries) return null;
    if (selectedSeries.custom_cover_path) {
      return `/covers/${selectedSeries.custom_cover_path}`;
    }
    if (coverBook) {
      return buildSeriesBookCoverUrl(coverBook);
    }
    return null;
  }, [selectedSeries, coverBook]);

  const coverSourceLabel = useMemo(() => {
    if (!selectedSeries) return "No cover selected";
    if (selectedSeries.custom_cover_path) return "Custom cover";
    if (coverBook) return "Using book cover";
    return "Auto-generated";
  }, [selectedSeries, coverBook]);

  const getStatusBadgeColor = (status: string) => {
    if (status === "finished") {
      return "bg-green-900/30 text-green-400 border border-green-700/50";
    }
    return "bg-blue-900/30 text-blue-400 border border-blue-700/50";
  };

  const getReadingStatusBadge = (status?: SeriesReadingStatus) => {
    if (!status) return null;

    const colors = {
      not_started: "bg-gray-700/30 text-gray-400 border-gray-600/50",
      reading: "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/30",
      completed: "bg-green-900/30 text-green-400 border-green-700/50",
    };

    const labels = {
      not_started: "Not Started",
      reading: `Reading (${status.read_books}/${status.total_books})`,
      completed: "Completed",
    };

    return (
      <Badge className={colors[status.reading_status]}>
        {labels[status.reading_status]}
      </Badge>
    );
  };

  const handleBookClick = (libraryBookId: string) => {
    if (!selectedSeries) {
      navigate(`/books/${libraryBookId}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("fromSeriesId", String(selectedSeries.id));
    if (selectedSeries.name) {
      params.set("fromSeriesName", selectedSeries.name);
    }

    navigate(
      `/books/${libraryBookId}?${params.toString()}`,
      {
        state: {
          fromSeries: {
            seriesId: selectedSeries.id,
            seriesName: selectedSeries.name,
          },
        },
      },
    );
  };

  if (!currentLibrary) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
          Please select a library to view series.
        </p>
      </div>
    );
  }

  if (isLoadingList) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
      </div>
    );
  }

  if (listError) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <p className="text-red-400">
          Error loading series: {listError instanceof Error ? listError.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${
        darkMode ? "border-[#2a2a2a]" : "border-gray-200"
      }`}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="w-6 h-6">
            <polygon
              points="50,5 90,30 90,70 50,95 10,70 10,30"
              fill="currentColor"
              className="text-[#8CE2D0]"
            />
          </svg>
          <h1 className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Series
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] h-[calc(100vh-80px)]">
        {/* Series List Sidebar */}
        <div className={`border-r p-4 space-y-3 overflow-y-auto ${
          darkMode ? "bg-[#0a0a0a] border-[#2a2a2a]" : "bg-white border-gray-200"
        }`}>
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`} />
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${
                darkMode
                  ? "bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              }`}
            />
          </div>

          {/* New Series Button */}
          <Button
            onClick={handleCreateSeries}
            className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Series
          </Button>

          {/* Series List */}
          <div className="space-y-2 mt-4">
            {filteredSeries.length === 0 ? (
              <p className={`text-sm text-center py-8 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                {searchQuery ? "No series found" : "No series yet. Create one to get started!"}
              </p>
            ) : (
              filteredSeries.map((series) => (
                <div
                  key={series.id}
                  onClick={() => handleSelectSeries(series)}
                  className={`p-3 rounded-lg cursor-pointer transition-all relative overflow-hidden ${
                    selectedSeriesId === series.id
                      ? darkMode
                        ? "bg-[#1a2a2a] border-l-2 border-[#8CE2D0]"
                        : "bg-[#8CE2D0]/10 border-l-2 border-[#8CE2D0]"
                      : darkMode
                        ? "bg-[#1a1a1a] hover:bg-[#1a2020]"
                        : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                <div className="absolute top-0 right-0 w-12 h-12 opacity-5 pointer-events-none">
                    <svg viewBox="0 0 50 50" className="w-full h-full">
                      <polygon
                        points="25,2 45,15 45,35 25,48 5,35 5,15"
                        fill="currentColor"
                        className="text-[#C47978]"
                      />
                    </svg>
                  </div>
                  <p className={`text-sm mb-1 relative z-10 font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {series.name}
                  </p>
                  <p className={`text-xs relative z-10 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {series.publication_status === "finished" ? "Complete" : "In Progress"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Series Detail */}
        <div className="p-6 overflow-y-auto">
          {selectedSeries ? (
            <div className="max-w-4xl mx-auto">
              {/* Series Info Card */}
              <div className={`rounded-lg p-6 border mb-6 relative overflow-hidden ${
                darkMode
                  ? "bg-[#1a1a1a] border-[#2a2a2a]"
                  : "bg-white border-gray-200"
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon
                      points="50,5 90,30 90,70 50,95 10,70 10,30"
                      fill="currentColor"
                      className="text-[#8CE2D0]"
                    />
                  </svg>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className={`text-2xl mb-3 font-semibold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedSeries.name}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusBadgeColor(selectedSeries.publication_status)}>
                        {selectedSeries.publication_status === "finished" ? "Complete" : "In Progress"}
                      </Badge>
                      {readingStatus && getReadingStatusBadge(readingStatus)}
                      {seriesBooks.length > 0 && (
                        <Badge className={darkMode
                          ? "bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                        }>
                          {seriesBooks.length} {seriesBooks.length === 1 ? "book" : "books"}
                        </Badge>
                      )}
                    </div>
                {selectedSeries.description && (
                  <p className={`mt-3 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {selectedSeries.description}
                  </p>
                )}
                <div className="mt-6 flex flex-col lg:flex-row gap-6">
                  <div className="w-full max-w-xs">
                    <div
                      className={`aspect-[3/4] rounded-lg border flex items-center justify-center overflow-hidden ${
                        darkMode ? "bg-[#0a0a0a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {currentCoverUrl ? (
                        <img
                          src={currentCoverUrl}
                          alt={selectedSeries.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={`text-4xl font-semibold ${
                          darkMode ? "text-gray-700" : "text-gray-300"
                        }`}>
                          {selectedSeries.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-2 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                      {coverSourceLabel}
                      {coverBook && !selectedSeries.custom_cover_path && (
                        <> · {coverBook.title}</>
                      )}
                    </p>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Button
                      onClick={handleUploadCoverClick}
                      className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
                      disabled={coverMutationPending || !selectedSeriesId}
                    >
                      Upload Custom Cover
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleClearCover}
                      disabled={
                        coverMutationPending ||
                        !selectedSeriesId ||
                        (!selectedSeries?.custom_cover_path && !selectedSeries?.cover_book_id)
                      }
                      className={darkMode ? "bg-[#1f1f1f] border border-[#2a2a2a] text-gray-200" : "bg-white border border-gray-200"}
                    >
                      Clear Cover
                    </Button>
                    <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                      Tip: choose "Set as Series Cover" on a book below to reuse that cover.
                    </p>
                  </div>
                </div>
              </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={handleEditSeries}
                      className={`transition-colors ${
                        darkMode
                          ? "text-gray-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="Edit series"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDeleteSeries}
                      className="text-gray-400 hover:text-[#C47978] transition-colors"
                      title="Delete series"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Books in Series */}
              <div className={`rounded-lg p-6 border ${
                darkMode
                  ? "bg-[#1a1a1a] border-[#2a2a2a]"
                  : "bg-white border-gray-200"
              }`}>
                <h3 className={`mb-4 font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  Books in Series
                </h3>

                {isLoadingBooks ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
                  </div>
                ) : seriesBooks.length === 0 ? (
                  <div className={`rounded-lg p-4 flex items-start gap-3 ${
                    darkMode
                      ? "bg-[#0a3a4a] border border-[#8CE2D0]/30"
                      : "bg-[#8CE2D0]/10 border border-[#8CE2D0]/30"
                  }`}>
                    <Info className="w-5 h-5 text-[#8CE2D0] flex-shrink-0 mt-0.5" />
                    <p className={`text-sm ${darkMode ? "text-[#8CE2D0]" : "text-[#6ab3a3]"}`}>
                      No books in this series yet. Add books and assign them to "{selectedSeries.name}" in the Books page.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {seriesBooks.map((book) => (
                      <div
                        key={book.library_book_id}
                        onClick={() => handleBookClick(book.library_book_id)}
                        className={`rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                          book.is_series_cover
                            ? "ring-2 ring-[#8CE2D0]"
                            : ""
                        } ${
                          darkMode
                            ? "bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#8CE2D0]/50"
                            : "bg-gray-50 border border-gray-200 hover:border-[#8CE2D0]/50"
                        }`}
                      >
                        <div className="aspect-[2/3] relative bg-gray-800">
                          {buildSeriesBookCoverUrl(book) ? (
                            <img
                              src={buildSeriesBookCoverUrl(book) || ""}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8CE2D0]/20 to-[#C47978]/20">
                              <span className="text-4xl font-bold text-white/50">
                                {book.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {book.is_series_cover && (
                            <div className="absolute top-2 right-2 bg-[#8CE2D0] text-black text-xs px-2 py-1 rounded">
                              Cover
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className={`text-sm font-medium line-clamp-2 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}>
                            {book.title}
                          </p>
                          <Button
                            size="sm"
                            variant={book.is_series_cover ? "secondary" : "outline"}
                            className={`mt-3 w-full text-xs ${
                              book.is_series_cover
                                ? darkMode
                                  ? "bg-[#8CE2D0]/20 text-[#8CE2D0]"
                                  : "bg-[#8CE2D0]/20 text-[#174d45]"
                                : darkMode
                                  ? "border-[#3a3a3a] text-gray-300"
                                  : "border-gray-200 text-gray-700"
                            }`}
                            disabled={coverMutationPending && coverActionBookId !== book.book_id}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSetCoverFromBook(book);
                            }}
                          >
                            {book.is_series_cover
                              ? "Current Series Cover"
                              : coverActionBookId === book.book_id && setCoverFromBookMutation.isPending
                                ? "Setting..."
                                : "Set as Series Cover"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                {filteredSeries.length === 0
                  ? "Create a series to get started"
                  : "Select a series to view details"}
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverFileChange}
      />

      {/* Form Dialog */}
      <SeriesFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleFormClose}
        series={editingSeries}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default SeriesPage;
