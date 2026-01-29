import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
  Stack,
  IconButton,
  Card,
  CardMedia,
  CardActions,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Alert
} from "@mui/material";
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, Search as SearchIcon } from "@mui/icons-material";
import { Formik, FormikHelpers } from "formik";
import * as yup from "yup";

import { Book, BookFormValues } from "../../types/book";
import MetadataSearchPanel from "./MetadataSearchPanel";
import { uploadBookCover, searchBooks } from "../../api/books";
import { useMutation } from "@tanstack/react-query";

export type { BookFormValues } from "../../types/book";


interface BookFormDialogProps {
  open: boolean;
  libraryId: string;
  initialValues: BookFormValues;
  onClose: () => void;
  onSubmit: (
    values: BookFormValues,
    formikHelpers: FormikHelpers<BookFormValues>
  ) => Promise<void>;
  isEdit: boolean;
  fullScreen?: boolean;
  embedded?: boolean; // When true, renders form without Dialog wrapper
  userRole?: string | null; // User's role in the library: 'owner', 'admin', 'member', 'viewer'
}

const validationSchema = yup.object({
  title: yup.string().required("Title is required"),
  identifier: yup.string().required("Identifier is required"),
  loan_due_date: yup.string().nullable(),
  loan_status: yup.string().oneOf(["available", "loaned"])
});

const emptyValues: BookFormValues = {
  id: undefined,
  title: "",
  creator: [],
  subject: [],
  description: "",
  publisher: "",
  date: "",
  identifier: "",
  language: [],
  ownership_status: "To Check",
  condition: "",
  shelf_location: "",
  book_type: "",
  library_notes: "",
  loan_status: "available",
  loan_due_date: "",
  cover_image_url: "",
  metadata_status: "pending",
  series: "",
  reading_status: null,
  grade: null,
  personal_notes: ""
};

const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return value.split("T")[0];
};

export const createInitialValues = (book?: Book): BookFormValues => {
  if (!book) return emptyValues;
  return {
    id: book.id,
    title: book.title ?? "",
    creator: book.creator ?? [],
    subject: book.subject ?? [],
    description: book.description ?? "",
    publisher: book.publisher ?? "",
    date: book.date ?? "",
    identifier: book.identifier ?? "",
    language: book.language ?? [],
    ownership_status: book.ownership_status ?? "To Check",
    condition: book.condition ?? "",
    shelf_location: book.shelf_location ?? "",
    book_type: book.book_type ?? "",
    library_notes: book.library_notes ?? "",
    loan_status: book.loan_status ?? "available",
    loan_due_date: toDateInput(book.loan_due_date),
    cover_image_url: book.cover_image_url ?? "",
    cover_image_path: book.cover_image_path ?? null,
    metadata_status: book.metadata_status ?? "pending",
    series: book.series ?? "",
    reading_status: book.reading_status ?? null,
    grade: book.grade ?? null,
    personal_notes: book.personal_notes ?? ""
  };
};

const ownershipStatuses = [
  "Wanted",
  "Owned",
  "To Check"
];

const conditionOptions = [
  "New",
  "Like New",
  "Very Good",
  "Good",
  "Fair",
  "Poor"
];

const bookTypeOptions = [
  "paperback",
  "hardcover",
  "ebook",
  "pdf",
  "audiobook"
];

const loanStatuses = [
  { value: "available", label: "Available" },
  { value: "loaned", label: "Loaned" }
];

const readingStatuses = [
  { value: "", label: "None" },
  { value: "To Read", label: "To Read" },
  { value: "Up Next", label: "Up Next" },
  { value: "Reading", label: "Reading" },
  { value: "Read", label: "Read" },
  { value: "Abandoned", label: "Abandoned" }
];

// Helper function to get the cover image URL (handles both local and external URLs)
const getCoverImageUrl = (book: Book | BookFormValues): string | null => {
  if ('id' in book && book.cover_image_path) {
    // Convert local path to URL
    const filename = book.cover_image_path.split(/[\\/]/).pop();
    return `/covers/${filename}`;
  }
  return book.cover_image_url ?? null;
};

const BookFormDialog = ({ open, libraryId, onClose, initialValues, onSubmit, isEdit, fullScreen = false, embedded = false, userRole }: BookFormDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  // Check if user is read-only (viewer)
  const isReadOnly = userRole === 'viewer';

  const searchMutation = useMutation({
    mutationFn: () => searchBooks(libraryId, searchQuery, "auto"),
    onSuccess: (data) => {
      setSearchResults(data);
    }
  });

  // Auto-populate search query and trigger search when dialog opens with an identifier
  useEffect(() => {
    if (open && !isEdit && initialValues.identifier && !hasAutoSearched) {
      setSearchQuery(initialValues.identifier);
      setHasAutoSearched(true);
      // Trigger search after a short delay to ensure state is updated
      setTimeout(() => {
        searchMutation.mutate();
      }, 100);
    }

    // Reset when dialog closes
    if (!open) {
      setHasAutoSearched(false);
      setSearchQuery("");
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, initialValues.identifier, hasAutoSearched]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = async (libraryBookId: string) => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadBookCover(libraryId, libraryBookId, selectedFile);
      setSelectedFile(null);
      setUploadPreview(null);
      // Refresh the page or update the book data
      window.location.reload();
    } catch (error) {
      console.error('Failed to upload cover:', error);
      alert('Failed to upload cover image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadPreview(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{isEdit ? "Edit Book" : "Add Book"}</DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={async (values, helpers) => {
          await onSubmit(values, helpers);
        }}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleSubmit,
          setFieldValue,
          isSubmitting
        }) => (
          <form onSubmit={handleSubmit}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                {!isEdit && <Tab label="Search Books" />}
                <Tab label="Edit Metadata" />
                {isEdit && <Tab label="Search Metadata" disabled={!values.identifier} />}
              </Tabs>
            </Box>
            <DialogContent dividers>
              {/* Search Tab - Only for new books */}
              {!isEdit && activeTab === 0 && (
                <Stack spacing={2}>
                  <Alert severity="info">
                    Search for a book by title or ISBN to auto-fill metadata
                  </Alert>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      label="Search by Title or ISBN"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          searchMutation.mutate();
                        }
                      }}
                      placeholder="Enter book title or ISBN..."
                      helperText="Auto-detects whether you're searching by title or ISBN"
                    />
                    <Button
                      variant="contained"
                      startIcon={searchMutation.isPending ? <CircularProgress size={20} /> : <SearchIcon />}
                      onClick={() => searchMutation.mutate()}
                      disabled={!searchQuery || searchMutation.isPending}
                    >
                      Search
                    </Button>
                  </Stack>

                  {searchResults.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Found {searchResults.length} results - Click to select:
                      </Typography>
                      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {searchResults.map((result, index) => (
                          <div key={index}>
                            <ListItemButton
                              onClick={() => {
                                // Populate form with selected book data
                                setFieldValue('title', result.title || '');
                                setFieldValue('creator', result.creator || []);
                                setFieldValue('subject', result.subject || []);
                                setFieldValue('description', result.description || '');
                                setFieldValue('publisher', result.publisher || '');
                                setFieldValue('date', result.date || '');
                                setFieldValue('identifier', result.identifier || '');
                                setFieldValue('language', result.language || []);
                                setFieldValue('cover_image_url', result.cover_image_url || '');
                                // Switch to edit tab
                                setActiveTab(1);
                              }}
                            >
                              <Stack direction="row" spacing={2} sx={{ width: '100%' }} alignItems="flex-start">
                                {result.cover_image_url && (
                                  <Card sx={{ minWidth: 80 }}>
                                    <CardMedia
                                      component="img"
                                      height="120"
                                      image={result.cover_image_url}
                                      alt={result.title}
                                      sx={{ width: 80, objectFit: 'contain' }}
                                    />
                                  </Card>
                                )}
                                <ListItemText
                                  primary={result.title}
                                  secondary={
                                    <Stack spacing={0.5}>
                                      {result.creator && (
                                        <Typography variant="body2">
                                          By: {Array.isArray(result.creator) ? result.creator.join(', ') : result.creator}
                                        </Typography>
                                      )}
                                      {result.publisher && (
                                        <Typography variant="body2">
                                          Publisher: {result.publisher}
                                        </Typography>
                                      )}
                                      {result.date && (
                                        <Typography variant="body2">
                                          Date: {result.date}
                                        </Typography>
                                      )}
                                      {result.identifier && (
                                        <Typography variant="body2" color="primary">
                                          ISBN: {result.identifier}
                                        </Typography>
                                      )}
                                    </Stack>
                                  }
                                />
                              </Stack>
                            </ListItemButton>
                            {index < searchResults.length - 1 && <Divider />}
                          </div>
                        ))}
                      </List>
                    </Box>
                  )}

                  {searchMutation.isSuccess && searchResults.length === 0 && (
                    <Alert severity="warning">
                      No books found. Try a different search term or enter metadata manually.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* Metadata Search Panel - Only for existing books with identifier */}
              {isEdit && activeTab === 1 && (
                <MetadataSearchPanel
                  identifier={values.identifier}
                  currentValues={values}
                  onAcceptField={(fieldName, value) => {
                    setFieldValue(fieldName, value);
                  }}
                />
              )}

              {/* Edit Metadata Tab */}
              {((isEdit && activeTab === 0) || (!isEdit && activeTab === 1)) && (
              <Grid container spacing={2}>
                {/* Read-only user notice */}
                {isReadOnly && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      You have read-only access to this library. You can only edit personal fields (reading status, grade, personal notes).
                    </Alert>
                  </Grid>
                )}

                {/* Metadata fields - hidden for read-only users */}
                {!isReadOnly && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="title"
                        label="Title"
                        fullWidth
                        value={values.title}
                        onChange={handleChange}
                        error={touched.title && Boolean(errors.title)}
                        helperText={touched.title && (errors.title as string)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="identifier"
                        label="Identifier (ISBN/Barcode)"
                        fullWidth
                        value={values.identifier}
                        onChange={handleChange}
                        error={touched.identifier && Boolean(errors.identifier)}
                        helperText={touched.identifier && (errors.identifier as string)}
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9]*'
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="creator"
                        label="Creator(s)"
                        placeholder="Separate multiple values with commas"
                        fullWidth
                        value={values.creator?.join(", ") ?? ""}
                        onChange={(event) => setFieldValue("creator", toList(event.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="publisher"
                        label="Publisher"
                        fullWidth
                        value={values.publisher ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="series"
                        label="Series"
                        fullWidth
                        value={values.series ?? ""}
                        onChange={handleChange}
                        placeholder="e.g., D&D 2024, Harry Potter"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="description"
                        label="Description"
                        fullWidth
                        multiline
                        minRows={3}
                        value={values.description ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        name="library_notes"
                        label="Library Notes (visible to all library members)"
                        fullWidth
                        multiline
                        minRows={2}
                        value={values.library_notes ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="subject"
                        label="Subject(s)"
                        placeholder="Separate multiple values with commas"
                        fullWidth
                        value={values.subject?.join(", ") ?? ""}
                        onChange={(event) => setFieldValue("subject", toList(event.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="language"
                        label="Language(s)"
                        placeholder="Separate multiple values with commas"
                        fullWidth
                        value={values.language?.join(", ") ?? ""}
                        onChange={(event) => setFieldValue("language", toList(event.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="date"
                        label="Publication Date"
                        fullWidth
                        value={values.date ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="condition"
                        label="Condition"
                        select
                        fullWidth
                        value={values.condition ?? ""}
                        onChange={handleChange}
                      >
                        <MenuItem value="">Unspecified</MenuItem>
                        {conditionOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="book_type"
                        label="Book Type"
                        select
                        fullWidth
                        value={values.book_type ?? ""}
                        onChange={handleChange}
                      >
                        <MenuItem value="">Unspecified</MenuItem>
                        {bookTypeOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="ownership_status"
                        label="Ownership Status"
                        select
                        fullWidth
                        value={values.ownership_status}
                        onChange={handleChange}
                      >
                        {ownershipStatuses.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="shelf_location"
                        label="Shelf / Location"
                        fullWidth
                        value={values.shelf_location ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        name="loan_status"
                        label="Loan Status"
                        select
                        fullWidth
                        value={values.loan_status}
                        onChange={handleChange}
                      >
                        {loanStatuses.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="loan_due_date"
                        label="Loan Due Date"
                        type="date"
                        fullWidth
                        value={values.loan_due_date ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFieldValue("loan_due_date", value);
                          if (value && values.loan_status !== "loaned") {
                            setFieldValue("loan_status", "loaned");
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        name="cover_image_url"
                        label="Cover Image URL"
                        fullWidth
                        value={values.cover_image_url ?? ""}
                        onChange={handleChange}
                      />
                    </Grid>
                  </>
                )}

                {/* Personal fields - always visible */}
                <Grid item xs={12} md={6}>
                  <TextField
                    name="reading_status"
                    label="Reading Status"
                    select
                    fullWidth
                    value={values.reading_status ?? ""}
                    onChange={handleChange}
                  >
                    {readingStatuses.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    name="grade"
                    label="Grade (1-10)"
                    type="number"
                    fullWidth
                    value={values.grade ?? ""}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="personal_notes"
                    label="Personal Notes (visible only to you)"
                    fullWidth
                    multiline
                    minRows={2}
                    value={values.personal_notes ?? ""}
                    onChange={handleChange}
                  />
                </Grid>

                {/* Cover Image Upload Section - hidden for read-only users */}
                {!isReadOnly && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Cover Image
                    </Typography>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Current Cover Preview */}
                    {initialValues.id && getCoverImageUrl(initialValues) && (
                      <Card sx={{ maxWidth: 400 }}>
                        <CardMedia
                          component="img"
                          height="500"
                          image={getCoverImageUrl(initialValues) || undefined}
                          alt="Current cover"
                          sx={{ objectFit: 'contain' }}
                        />
                        <CardActions>
                          <Typography variant="caption" color="text.secondary">
                            Current Cover
                          </Typography>
                        </CardActions>
                      </Card>
                    )}

                    {/* Upload Preview */}
                    {uploadPreview && (
                      <Card sx={{ maxWidth: 400 }}>
                        <CardMedia
                          component="img"
                          height="500"
                          image={uploadPreview}
                          alt="Upload preview"
                          sx={{ objectFit: 'contain' }}
                        />
                        <CardActions>
                          <Typography variant="caption" color="text.secondary">
                            New Upload
                          </Typography>
                          <IconButton size="small" onClick={handleClearFile}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </CardActions>
                      </Card>
                    )}

                    {/* Upload Button */}
                    <Stack spacing={1}>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        disabled={!initialValues.id}
                      >
                        Choose File
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelect}
                        />
                      </Button>
                      {selectedFile && initialValues.id && (
                        <Button
                          variant="contained"
                          onClick={() => handleFileUpload(initialValues.id!)}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload Cover'}
                        </Button>
                      )}
                      {!initialValues.id && (
                        <Typography variant="caption" color="text.secondary">
                          Save the book first to upload a cover
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                  </Grid>
                )}
              </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Save
              </Button>
            </DialogActions>
          </form>
        )}
      </Formik>
    </Dialog>
  );
};

export default BookFormDialog;













