import {
  Box,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
  Grid,
  Card,
  CardMedia
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  RateReview as RateReviewIcon
} from "@mui/icons-material";
import { Book } from "../../types/book";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";

interface BookViewTabProps {
  book: Book;
  onEdit: () => void;
  onDelete: () => void;
  onEnrich: () => void;
  onReview?: () => void;
}

const BookViewTab = ({ book, onEdit, onDelete, onEnrich, onReview }: BookViewTabProps) => {
  const getCoverUrl = () => {
    if (book.cover_image_path) {
      const filename = book.cover_image_path.split(/[\\/]/).pop();
      return `/covers/${filename}`;
    }
    return book.cover_image_url;
  };

  const InfoRow = ({ label, value }: { label: string; value: string | string[] | null | undefined }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        {Array.isArray(value) ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {value.map((item, idx) => (
              <Chip key={idx} label={item} size="small" />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2">{value}</Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Cover Image */}
        <Grid item xs={12} md={4}>
          <Card>
            {getCoverUrl() ? (
              <CardMedia
                component="img"
                image={getCoverUrl()}
                alt={book.title}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 400,
                  objectFit: 'contain',
                  bgcolor: 'grey.100'
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <BookCoverPlaceholder
                  title={book.title}
                  width="100%"
                  height={400}
                  variant="detail"
                />
              </Box>
            )}
          </Card>
        </Grid>

        {/* Book Details */}
        <Grid item xs={12} md={8}>
          <Stack spacing={2}>
            {/* Title and Status */}
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {book.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={book.loan_status === "loaned" ? "Loaned" : "Available"}
                  color={book.loan_status === "loaned" ? "warning" : "success"}
                  size="small"
                />
                <Chip
                  label={book.metadata_status}
                  color={
                    book.metadata_status === "complete"
                      ? "success"
                      : book.metadata_status === "failed"
                      ? "error"
                      : "warning"
                  }
                  size="small"
                />
                {book.metadata_status === "awaiting_review" && (
                  <Chip label="Review Needed" color="warning" size="small" variant="outlined" />
                )}
              </Stack>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={onEdit}
                size="small"
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={onEnrich}
                size="small"
              >
                Enrich
              </Button>
              {book.metadata_status === "awaiting_review" && onReview && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RateReviewIcon />}
                  onClick={onReview}
                  size="small"
                >
                  Review
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onDelete}
                size="small"
              >
                Delete
              </Button>
            </Stack>

            <Divider />

            {/* Metadata Fields */}
            <Box>
              <InfoRow label="Author(s)" value={book.creator} />
              <InfoRow label="ISBN/Identifier" value={book.identifier} />
              <InfoRow label="Publisher" value={book.publisher} />
              <InfoRow label="Publication Date" value={book.date} />
              <InfoRow label="Series" value={book.series} />
              <InfoRow label="Subjects" value={book.subject} />
              <InfoRow label="Description" value={book.description} />
              <InfoRow label="Contributors" value={book.contributor} />
              <InfoRow label="Format" value={book.format} />
              <InfoRow label="Language" value={book.language} />
              <InfoRow label="Type" value={book.type} />
              <InfoRow label="Source" value={book.source} />
              <InfoRow label="Rights" value={book.rights} />

              <Divider sx={{ my: 2 }} />

              <InfoRow label="Ownership Status" value={book.ownership_status} />
              <InfoRow label="Shelf Location" value={book.shelf_location} />
              <InfoRow label="Condition" value={book.condition} />
              <InfoRow label="Book Type" value={book.book_type} />
              <InfoRow label="Library Notes" value={book.library_notes} />

              {book.loan_status === "loaned" && (
                <>
                  <InfoRow label="Due Date" value={book.loan_due_date} />
                </>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Personal Reading Data */}
              <InfoRow label="Reading Status" value={book.reading_status} />
              <InfoRow label="Grade" value={book.grade?.toString()} />
              {book.completion_history && book.completion_history.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Times Read
                  </Typography>
                  <Typography variant="body2">
                    {book.completion_history.length} time{book.completion_history.length !== 1 ? 's' : ''}
                  </Typography>
                  {book.completion_history.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Last completed: {new Date(book.completion_history[book.completion_history.length - 1]).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}

              <InfoRow label="Personal Notes" value={book.personal_notes} />

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Added: {new Date(book.created_at).toLocaleDateString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Updated: {new Date(book.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BookViewTab;

