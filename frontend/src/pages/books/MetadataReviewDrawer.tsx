import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyMetadataCandidate,
  getMetadataCandidate,
  rejectMetadataCandidate
} from "../../api/books";
import { MetadataCandidateField, MetadataCandidateResponse } from "../../types/book";
import { useLibrary } from "../../contexts/LibraryContext";

interface MetadataReviewDrawerProps {
  bookId: string | null;
  open: boolean;
  onClose: () => void;
}

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "�";
  }
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("Failed to stringify candidate value", error);
      return String(value);
    }
  }
  return String(value);
};

const MetadataReviewDrawer = ({ bookId, open, onClose }: MetadataReviewDrawerProps) => {
  const { currentLibrary } = useLibrary();
  const queryClient = useQueryClient();
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery<MetadataCandidateResponse | null>({
    queryKey: ["metadata-candidate", currentLibrary?.id, bookId],
    queryFn: () => (
      bookId && currentLibrary
        ? getMetadataCandidate(currentLibrary.id, bookId)
        : Promise.resolve(null)
    ),
    enabled: open && Boolean(bookId) && Boolean(currentLibrary),
  });

  useEffect(() => {
    if (!open) {
      setSelectedFields(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (data?.metadata_candidate) {
      setSelectedFields(new Set(Object.keys(data.metadata_candidate)));
    }
  }, [data?.metadata_candidate]);

  const applyMutation = useMutation({
    mutationFn: ({ fields }: { fields?: string[] }) => {
      if (!bookId || !currentLibrary) return Promise.resolve(null);
      return applyMetadataCandidate(currentLibrary.id, bookId, fields ?? []);
    },
    onSuccess: () => {
      if (!currentLibrary || !bookId) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      void queryClient.invalidateQueries({ queryKey: ["metadata-candidate", currentLibrary.id, bookId] });
      void refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!bookId || !currentLibrary) return Promise.resolve(null);
      return rejectMetadataCandidate(currentLibrary.id, bookId);
    },
    onSuccess: () => {
      if (!currentLibrary || !bookId) return;
      void queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      void queryClient.invalidateQueries({ queryKey: ["metadata-candidate", currentLibrary.id, bookId] });
      void refetch();
    },
  });

  const candidateEntries = useMemo<[string, MetadataCandidateField][]>(() => {
    if (!data?.metadata_candidate) return [];
    return Object.entries(data.metadata_candidate) as [string, MetadataCandidateField][];
  }, [data?.metadata_candidate]);

  const handleToggleField = (field: string) => {
    setSelectedFields((current) => {
      const copy = new Set(current);
      if (copy.has(field)) {
        copy.delete(field);
      } else {
        copy.add(field);
      }
      return copy;
    });
  };

  const disabled = isLoading || isFetching || applyMutation.isLoading || rejectMutation.isLoading;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}>
      <Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CompareArrowsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Review Metadata
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
        {isLoading || isFetching ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
            <CircularProgress />
          </Stack>
        ) : !candidateEntries.length ? (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="body1">No metadata suggestions pending.</Typography>
            {bookId && (
              <Button variant="outlined" onClick={() => void refetch()}>
                Refresh
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Select the fields you want to update. Unselected entries will remain unchanged.
            </Typography>
            <List dense>
              {candidateEntries.map(([field, payload]) => {
                const isSelected = selectedFields.has(field);
                return (
                  <ListItem
                    key={field}
                    onClick={() => handleToggleField(field)}
                    sx={{
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      mb: 1,
                      cursor: "pointer",
                      bgcolor: isSelected ? "action.selected" : "transparent"
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            color={isSelected ? "primary" : "default"}
                            icon={isSelected ? <CheckIcon /> : undefined}
                            label={field}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Current: {formatValue(payload.current)}
                          </Typography>
                          <Typography variant="caption" color="primary">
                            Suggested: {formatValue(payload.suggested)}
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={isSelected ? "Selected" : "Ignored"}
                        size="small"
                        color={isSelected ? "primary" : "default"}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Stack>
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            startIcon={<DoNotDisturbIcon />}
            onClick={() => rejectMutation.mutate()}
            disabled={disabled || !candidateEntries.length}
          >
            Keep All
          </Button>
          <Button
            variant="outlined"
            onClick={() => applyMutation.mutate({ fields: Array.from(selectedFields) })}
            disabled={disabled || !candidateEntries.length}
          >
            Apply Selected
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => applyMutation.mutate({})}
            disabled={disabled || !candidateEntries.length}
          >
            Apply All
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default MetadataReviewDrawer;



