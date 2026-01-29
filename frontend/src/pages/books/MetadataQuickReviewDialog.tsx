import { useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { getMetadataCandidate } from "../../api/books";
import { useLibrary } from "../../contexts/LibraryContext";
import { MetadataCandidateField, MetadataCandidateResponse } from "../../types/book";

type MetadataQuickReviewDialogProps = {
  bookId: string | null;
  open: boolean;
  onClose: () => void;
    onOpenDrawer: (bookId: string) => void;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("Failed to stringify quick review value", error);
      return String(value);
    }
  }
  return String(value);
};

const MetadataQuickReviewDialog = ({
  bookId,
  open,
  onClose,
  onOpenDrawer
}: MetadataQuickReviewDialogProps) => {
  const { currentLibrary } = useLibrary();
  const { data, isLoading, isFetching, isError } = useQuery<MetadataCandidateResponse | null>({
    queryKey: ["metadata-candidate", currentLibrary?.id, bookId],
    queryFn: () => (
      bookId && currentLibrary
        ? getMetadataCandidate(currentLibrary.id, bookId)
        : Promise.resolve(null)
    ),
    enabled: open && Boolean(bookId) && Boolean(currentLibrary),
    staleTime: 1000 * 30,
  });

  const candidateEntries = useMemo<[string, MetadataCandidateField][]>(() => {
    if (!data?.metadata_candidate) return [];
    return Object.entries(data.metadata_candidate) as [string, MetadataCandidateField][];
  }, [data?.metadata_candidate]);

    const disableActions = !bookId || !currentLibrary || isLoading || isFetching || isError;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="metadata-quick-review"
    >
      <DialogTitle id="metadata-quick-review">Metadata Suggestions</DialogTitle>
      <DialogContent dividers>
        {isLoading || isFetching ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
            <CircularProgress size={32} />
          </Stack>
        ) : isError ? (
          <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ minHeight: 160 }}>
            <Typography color="error" variant="body2">
              Failed to load suggestions. Try reopening this dialog.
            </Typography>
          </Stack>
        ) : !candidateEntries.length ? (
          <Stack spacing={2} alignItems="center" textAlign="center" sx={{ minHeight: 160 }}>
            <Typography variant="body2" color="text.secondary">
              No new metadata suggestions are available for this book.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              If enrichment recently completed, the review drawer may already be resolved.
            </Typography>
          </Stack>
        ) : (
          <List dense sx={{ py: 0 }}>
            {candidateEntries.map(([field, payload]) => (
              <ListItem key={field} disableGutters sx={{ mb: 1 }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{field}</Typography>
                    </Stack>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Current: {formatValue(payload.current)}
                      </Typography>
                      <Typography variant="caption" color="primary" display="block">
                        Suggested: {formatValue(payload.suggested)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Dismiss</Button>
        <Button
          variant="contained"
          onClick={() => bookId && onOpenDrawer(bookId)}
          disabled={disableActions || !candidateEntries.length}
        >
          Open Full Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MetadataQuickReviewDialog;





