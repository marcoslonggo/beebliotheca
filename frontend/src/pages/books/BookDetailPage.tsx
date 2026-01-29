import { useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Sparkles, BookOpen, Upload } from "lucide-react";

import { listBooks, updateBook, deleteBook, enrichBook, uploadBookCover } from "../../api/books";
import { Book } from "../../types/book";
import { useLibrary } from "../../contexts/LibraryContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button, Input, LoadingOverlay, Badge, Textarea } from "../../components/ui";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";
import { CoverCropDialog } from "../../components/CoverCropDialog";

const BookDetailPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLibrary } = useLibrary();
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);

  type FromSeriesInfo = { seriesId: number; seriesName?: string };

  const searchParams = new URLSearchParams(location.search);
  const locationState = location.state as { fromSeries?: FromSeriesInfo } | null;
  const stateSeries = locationState?.fromSeries;

  const parseSeriesId = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const querySeriesId = parseSeriesId(searchParams.get("fromSeriesId"));
  const querySeriesName = searchParams.get("fromSeriesName") || undefined;

  const fromSeries: FromSeriesInfo | null = stateSeries?.seriesId
    ? stateSeries
    : querySeriesId
      ? { seriesId: querySeriesId, seriesName: querySeriesName }
      : null;

  const navigateBackToCollection = () => {
    if (fromSeries?.seriesId) {
      const params = new URLSearchParams();
      params.set("seriesId", String(fromSeries.seriesId));
      if (fromSeries.seriesName) {
        params.set("seriesName", fromSeries.seriesName);
      }
      const search = params.toString();
      navigate(`/series${search ? `?${search}` : ""}`);
    } else {
      navigate("/books");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    creator: "",
    identifier: "",
    publisher: "",
    date: "",
    description: "",
    series: "",
    shelf_location: "",
    reading_status: "",
    grade: "",
    personal_notes: "",
  });

  // Fetch book details
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["books", currentLibrary?.id],
    queryFn: () => {
      if (!currentLibrary) throw new Error("No library selected");
      return listBooks(currentLibrary.id);
    },
    enabled: Boolean(currentLibrary),
  });

  const book = booksData?.items.find((b) => b.id === bookId);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      if (!currentLibrary || !bookId) throw new Error("Missing required data");
      return updateBook(currentLibrary.id, bookId, values);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      setIsEditing(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentLibrary || !bookId) throw new Error("Missing required data");
      return deleteBook(currentLibrary.id, bookId);
    },
    onSuccess: () => {
      navigateBackToCollection();
    },
  });

  // Enrich mutation
  const enrichMutation = useMutation({
    mutationFn: () => {
      if (!currentLibrary || !bookId) throw new Error("Missing required data");
      return enrichBook(currentLibrary.id, bookId);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  // Cover upload mutation
  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => {
      if (!currentLibrary || !bookId) throw new Error("Missing required data");
      return uploadBookCover(currentLibrary.id, bookId, file);
    },
    onSuccess: () => {
      if (!currentLibrary) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
    },
  });

  const handleEdit = () => {
    if (!book) return;
    setEditFormData({
      title: book.title || "",
      creator: book.creator?.join(", ") || "",
      identifier: book.identifier || "",
      publisher: book.publisher || "",
      date: book.date || "",
      description: book.description || "",
      series: book.series || "",
      shelf_location: book.shelf_location || "",
      reading_status: book.reading_status || "",
      grade: book.grade?.toString() || "",
      personal_notes: book.personal_notes || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    const payload = {
      title: editFormData.title,
      creator: editFormData.creator.split(",").map((a) => a.trim()).filter(Boolean),
      identifier: editFormData.identifier || null,
      publisher: editFormData.publisher || null,
      date: editFormData.date || null,
      description: editFormData.description || null,
      series: editFormData.series || null,
      shelf_location: editFormData.shelf_location || null,
      reading_status: editFormData.reading_status || null,
      grade: editFormData.grade ? parseInt(editFormData.grade) : null,
      personal_notes: editFormData.personal_notes || null,
    };

    try {
      await updateMutation.mutateAsync(payload);
    } catch (error: any) {
      alert(`Failed to update book: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync();
    } catch (error: any) {
      alert(`Failed to delete book: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleEnrich = async () => {
    try {
      await enrichMutation.mutateAsync();
    } catch (error: any) {
      alert(`Failed to enrich book: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    if (coverCropSrc) {
      URL.revokeObjectURL(coverCropSrc);
    }
    setCoverCropSrc(src);
    setIsCoverCropOpen(true);
  };

  const getCoverUrl = (book: Book): string | null => {
    if (book.cover_image_url) return book.cover_image_url;
    if (book.cover_image_path) {
      const filename = book.cover_image_path.split(/[\\/]/).pop();
      return filename ? `/covers/${filename}` : null;
    }
    return null;
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading book details..." />;
  }

  if (!book) {
    return (
      <div className={`p-6 ${darkMode ? "bg-coal" : "bg-gray-50"} min-h-screen`}>
        <div className="max-w-4xl mx-auto">
          <Button onClick={navigateBackToCollection} variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {fromSeries?.seriesName ? `Back to ${fromSeries.seriesName}` : "Back to Books"}
          </Button>
          <div className="text-center py-12">
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Book not found</p>
          </div>
        </div>
      </div>
    );
  }

  const coverUrl = getCoverUrl(book);

  return (
    <div className={`p-6 ${darkMode ? "bg-coal" : "bg-gray-50"} min-h-screen`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={navigateBackToCollection} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {fromSeries?.seriesName ? `Back to ${fromSeries.seriesName}` : "Back to Books"}
          </Button>

          {!isEditing && (
            <div className="flex gap-2">
              <Button onClick={handleEdit} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={handleEnrich}
                variant="outline"
                disabled={enrichMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {enrichMutation.isPending ? "Enriching..." : "Enrich"}
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                disabled={deleteMutation.isPending}
                className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}

          {isEditing && (
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !editFormData.title.trim()}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

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
          onConfirm={async (blob, previewUrl) => {
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            if (coverCropSrc) {
              URL.revokeObjectURL(coverCropSrc);
            }
            setCoverCropSrc(null);
            setIsCoverCropOpen(false);
            if (coverInputRef.current) {
              coverInputRef.current.value = "";
            }
            try {
              const file = new File([blob], "cover.jpg", { type: blob.type });
              await uploadCoverMutation.mutateAsync(file);
            } catch (error: any) {
              alert(`Failed to upload cover: ${error?.response?.data?.detail || error.message}`);
            }
          }}
        />

        {/* Main Content */}
        <div
          className={`rounded-xl border ${
            darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
          } overflow-hidden`}
        >
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column - Cover */}
              <div className="md:col-span-1">
                <div className="sticky top-8">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={book.title}
                      className="w-full rounded-lg shadow-lg"
                    />
                  ) : (
                    <BookCoverPlaceholder
                      title={book.title}
                      width="100%"
                      height={400}
                      variant="detail"
                    />
                  )}

                  {/* Upload Cover Button */}
                  {!isEditing && (
                    <div className="mt-4">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleCoverUpload}
                        disabled={uploadCoverMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={uploadCoverMutation.isPending}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadCoverMutation.isPending ? "Uploading..." : "Upload Cover"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="md:col-span-2 space-y-6">
                {!isEditing ? (
                  <>
                    {/* Title */}
                    <div>
                      <h1
                        className={`text-3xl font-bold mb-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {book.title}
                      </h1>
                      {book.creator && book.creator.length > 0 && (
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          by {book.creator.join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={book.loan_status === "loaned" ? "warning" : "success"}
                      >
                        {book.loan_status === "loaned" ? "Loaned" : "Available"}
                      </Badge>
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
                      {book.reading_status && (
                        <Badge variant="default">{book.reading_status}</Badge>
                      )}
                    </div>

                    {/* Description */}
                    {book.description && (
                      <div>
                        <h2
                          className={`text-lg font-semibold mb-2 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Description
                        </h2>
                        <p
                          className={`whitespace-pre-wrap ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {book.description}
                        </p>
                      </div>
                    )}

                    {/* Book Information */}
                    <div>
                      <h2
                        className={`text-lg font-semibold mb-3 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Book Information
                      </h2>
                      <dl className="grid grid-cols-2 gap-4">
                        {book.identifier && (
                          <>
                            <dt
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              ISBN
                            </dt>
                            <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                              {book.identifier}
                            </dd>
                          </>
                        )}
                        {book.publisher && (
                          <>
                            <dt
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Publisher
                            </dt>
                            <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                              {book.publisher}
                            </dd>
                          </>
                        )}
                        {book.date && (
                          <>
                            <dt
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Published
                            </dt>
                            <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                              {book.date}
                            </dd>
                          </>
                        )}
                        {book.series && (
                          <>
                            <dt
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Series
                            </dt>
                            <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                              {book.series}
                            </dd>
                          </>
                        )}
                        {book.shelf_location && (
                          <>
                            <dt
                              className={`text-sm font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              Location
                            </dt>
                            <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                              {book.shelf_location}
                            </dd>
                          </>
                        )}
                      </dl>
                    </div>

                    {/* Personal Reading Data */}
                    {(book.reading_status || book.grade || book.personal_notes) && (
                      <div>
                        <h2
                          className={`text-lg font-semibold mb-3 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          My Reading Data
                        </h2>
                        <dl className="space-y-3">
                          {book.reading_status && (
                            <div>
                              <dt
                                className={`text-sm font-medium mb-1 ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Reading Status
                              </dt>
                              <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                                {book.reading_status}
                              </dd>
                            </div>
                          )}
                          {book.grade && (
                            <div>
                              <dt
                                className={`text-sm font-medium mb-1 ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Rating
                              </dt>
                              <dd className={darkMode ? "text-gray-200" : "text-gray-900"}>
                                {book.grade}/10
                              </dd>
                            </div>
                          )}
                          {book.personal_notes && (
                            <div>
                              <dt
                                className={`text-sm font-medium mb-1 ${
                                  darkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Personal Notes
                              </dt>
                              <dd
                                className={`whitespace-pre-wrap ${
                                  darkMode ? "text-gray-200" : "text-gray-900"
                                }`}
                              >
                                {book.personal_notes}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </>
                ) : (
                  /* Edit Form */
                  <div className="space-y-4">
                    <Input
                      label="Title *"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, title: e.target.value })
                      }
                    />

                    <Input
                      label="Authors"
                      placeholder="Separate multiple authors with commas"
                      value={editFormData.creator}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, creator: e.target.value })
                      }
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="ISBN"
                        value={editFormData.identifier}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, identifier: e.target.value })
                        }
                      />
                      <Input
                        label="Publisher"
                        value={editFormData.publisher}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, publisher: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Published Date"
                        placeholder="YYYY-MM-DD"
                        value={editFormData.date}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, date: e.target.value })
                        }
                      />
                      <Input
                        label="Series"
                        value={editFormData.series}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, series: e.target.value })
                        }
                      />
                    </div>

                    <Input
                      label="Shelf Location"
                      value={editFormData.shelf_location}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, shelf_location: e.target.value })
                      }
                    />

                    <Textarea
                      label="Description"
                      value={editFormData.description}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, description: e.target.value })
                      }
                      rows={4}
                    />

                    <hr className={darkMode ? "border-[#2a2a2a]" : "border-gray-200"} />

                    <h3
                      className={`text-lg font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Personal Reading Data
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Reading Status"
                        placeholder="e.g., reading, read, unread"
                        value={editFormData.reading_status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            reading_status: e.target.value,
                          })
                        }
                      />
                      <Input
                        label="Rating (1-10)"
                        type="number"
                        min="1"
                        max="10"
                        value={editFormData.grade}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, grade: e.target.value })
                        }
                      />
                    </div>

                    <Textarea
                      label="Personal Notes"
                      value={editFormData.personal_notes}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, personal_notes: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
