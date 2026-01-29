import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  Chip,
  Alert
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useMutation } from "@tanstack/react-query";
import { getMetadataPreview } from "../../api/books";

interface MetadataSearchPanelProps {
  identifier: string;
  currentValues: Record<string, any>;
  onAcceptField: (fieldName: string, value: any) => void;
  onAcceptAll?: (metadata: Record<string, any>) => void;
}

const MetadataSearchPanel = ({ identifier, currentValues, onAcceptField, onAcceptAll }: MetadataSearchPanelProps) => {
  const [fetchedMetadata, setFetchedMetadata] = useState<Record<string, any> | null>(null);

  const searchMutation = useMutation({
    mutationFn: () => getMetadataPreview(identifier),
    onSuccess: (data) => {
      setFetchedMetadata(data);
    },
    onError: (error: Error) => {
      console.error("Metadata search failed:", error);
      alert(`Failed to search metadata: ${error.message}`);
    }
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }
    return String(value);
  };

  const hasChanged = (fieldName: string): boolean => {
    if (!fetchedMetadata) return false;
    const current = currentValues[fieldName];
    const fetched = fetchedMetadata[fieldName];

    if (Array.isArray(current) && Array.isArray(fetched)) {
      return JSON.stringify(current.sort()) !== JSON.stringify(fetched.sort());
    }
    return current !== fetched;
  };

  const fieldLabels: Record<string, string> = {
    title: "Title",
    creator: "Creator(s)",
    publisher: "Publisher",
    date: "Publication Date",
    description: "Description",
    subject: "Subject(s)",
    language: "Language(s)",
    cover_image_url: "Cover Image",
    contributor: "Contributor(s)",
    type: "Type",
    format: "Format",
    identifier: "Identifier",
    source: "Source",
    relation: "Relation",
    coverage: "Coverage",
    rights: "Rights",
    series: "Series"
  };

  const fieldsToShow = Object.keys(fieldLabels);

  if (!identifier) {
    return (
      <Alert severity="info">
        Please enter an ISBN or identifier to search for metadata.
      </Alert>
    );
  }

  const handleAcceptAll = () => {
    if (fetchedMetadata && onAcceptAll) {
      onAcceptAll(fetchedMetadata);
    } else if (fetchedMetadata) {
      // If no onAcceptAll callback, apply each field individually
      fieldsToShow.forEach((fieldName) => {
        const value = fetchedMetadata[fieldName];
        if (value !== null && value !== undefined && value !== "") {
          onAcceptField(fieldName, value);
        }
      });
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={searchMutation.isPending ? <CircularProgress size={20} /> : <SearchIcon />}
          onClick={() => searchMutation.mutate()}
          disabled={searchMutation.isPending}
        >
          Search Metadata
        </Button>
        {fetchedMetadata && (
          <Button
            variant="contained"
            startIcon={<DoneAllIcon />}
            onClick={handleAcceptAll}
            color="success"
          >
            Accept All
          </Button>
        )}
      </Stack>

      {fetchedMetadata && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Metadata Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Click the arrow (→) to move the fetched value into your current metadata
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            {fieldsToShow.map((fieldName) => {
              const changed = hasChanged(fieldName);
              const currentValue = formatValue(currentValues[fieldName]);
              const fetchedValue = formatValue(fetchedMetadata[fieldName]);

              // Skip only if no fetched value at all
              if (fetchedValue === "—") {
                return null;
              }

              return (
                <Paper
                  key={fieldName}
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: changed ? "action.hover" : "background.paper"
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="primary">
                        {fieldLabels[fieldName]}
                        {changed && (
                          <Chip
                            label="Different"
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Grid>

                    {/* Fetched Value (on the left now) */}
                    <Grid item xs={5}>
                      <Typography variant="caption" color="text.secondary">
                        Fetched
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          wordBreak: "break-word",
                          fontStyle: fetchedValue === "—" ? "italic" : "normal",
                          color: fetchedValue === "—" ? "text.disabled" : "success.main",
                          fontWeight: changed ? 600 : 400
                        }}
                      >
                        {fetchedValue}
                      </Typography>
                    </Grid>

                    {/* Arrow Button (pointing right: Fetched → Current) */}
                    <Grid item xs={2} sx={{ display: "flex", justifyContent: "center" }}>
                      {fetchedValue !== "—" && (
                        <IconButton
                          size="small"
                          color={changed ? "primary" : "default"}
                          onClick={() => onAcceptField(fieldName, fetchedMetadata[fieldName])}
                          title={changed ? "Accept fetched value" : "Use this value"}
                        >
                          <ArrowForwardIcon />
                        </IconButton>
                      )}
                    </Grid>

                    {/* Current Value (on the right now) */}
                    <Grid item xs={5}>
                      <Typography variant="caption" color="text.secondary">
                        Current
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          wordBreak: "break-word",
                          fontStyle: currentValue === "—" ? "italic" : "normal",
                          color: currentValue === "—" ? "text.disabled" : "text.primary"
                        }}
                      >
                        {currentValue}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default MetadataSearchPanel;
