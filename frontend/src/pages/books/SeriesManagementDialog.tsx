import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  TextField,
  Stack,
  Typography,
  Divider,
  Box,
  Card,
  CardMedia,
  CardActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  Chip,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BookCoverPlaceholder from "../../components/BookCoverPlaceholder";
import { useLibrary } from "../../contexts/LibraryContext";
import {
  listSeries,
  getSeriesBooks,
  createSeries,
  updateSeries,
  deleteSeries,
  Series,
  SeriesBook
} from "../../api/series";

interface SeriesManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

const SeriesManagementDialog = ({ open, onClose }: SeriesManagementDialogProps) => {
  const { currentLibrary } = useLibrary();
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [mobileTab, setMobileTab] = useState(0); // 0 = list, 1 = details

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const queryClient = useQueryClient();

  if (!currentLibrary) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Series</DialogTitle>
        <DialogContent>
          <Typography>Select or create a library to manage series.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Query all series
  const { data: seriesList = [] } = useQuery({
    queryKey: ["series", currentLibrary?.id],
    queryFn: () => (currentLibrary ? listSeries(currentLibrary.id) : Promise.resolve([])),
    enabled: open && Boolean(currentLibrary),
  });

  // Query books in selected series
  const { data: seriesBooks = [] } = useQuery({
    queryKey: ["series", currentLibrary?.id, selectedSeries?.id, "books"],
    queryFn: () =>
      currentLibrary && selectedSeries
        ? getSeriesBooks(currentLibrary.id, selectedSeries.id)
        : Promise.resolve([]),
    enabled: Boolean(currentLibrary && selectedSeries),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createSeries(currentLibrary.id, { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series", currentLibrary.id] });
      queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      setNewSeriesName("");
      setIsCreating(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSeries(currentLibrary.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series", currentLibrary.id] });
      queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      setEditingName(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSeries(currentLibrary.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series", currentLibrary.id] });
      queryClient.invalidateQueries({ queryKey: ["books", currentLibrary.id] });
      setSelectedSeries(null);
    }
  });

  const handleSetCover = (bookId: string) => {
    if (!selectedSeries) return;
    updateMutation.mutate({
      id: selectedSeries.id,
      data: { cover_book_id: bookId }
    });
  };

  const handleSaveName = () => {
    if (!selectedSeries || !editedName.trim()) return;
    updateMutation.mutate({
      id: selectedSeries.id,
      data: { name: editedName }
    });
  };

  // Helper to get cover URL
  const getCoverUrl = (book: SeriesBook) => {
    if (book.cover_image_path) {
      const filename = book.cover_image_path.split(/[\\/]/).pop();
      return `/covers/${filename}`;
    }
    return book.cover_image_url;
  };

  // Handle series selection on mobile - switch to details tab
  const handleSeriesSelect = (series: Series) => {
    setSelectedSeries(series);
    if (isMobile) {
      setMobileTab(1);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Manage Series</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {isMobile ? (
          <>
            <Tabs value={mobileTab} onChange={(_, v) => setMobileTab(v)} sx={{ mb: 2 }}>
              <Tab label="Series List" />
              <Tab label="Details" disabled={!selectedSeries} />
            </Tabs>

            {mobileTab === 0 ? (
              <Stack spacing={1}>
                {isCreating ? (
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Series name"
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      autoFocus
                    />
                    <Button
                      size="small"
                      onClick={() => createMutation.mutate(newSeriesName)}
                      disabled={!newSeriesName.trim() || createMutation.isPending}
                    >
                      Add
                    </Button>
                    <IconButton size="small" onClick={() => setIsCreating(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ) : (
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreating(true)}
                    variant="outlined"
                    size="small"
                    fullWidth
                  >
                    New Series
                  </Button>
                )}
                <Divider />
                <List>
                  {seriesList.map((series) => (
                    <ListItemButton
                      key={series.id}
                      selected={selectedSeries?.id === series.id}
                      onClick={() => handleSeriesSelect(series)}
                    >
                      <ListItemText primary={series.name} />
                    </ListItemButton>
                  ))}
                </List>
              </Stack>
            ) : (
              selectedSeries && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {editingName ? (
                      <>
                        <TextField
                          size="small"
                          fullWidth
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          autoFocus
                        />
                        <Button size="small" onClick={handleSaveName}>
                          Save
                        </Button>
                        <IconButton size="small" onClick={() => setEditingName(false)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {selectedSeries.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditedName(selectedSeries.name);
                            setEditingName(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteMutation.mutate(selectedSeries.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Stack>

                  <Divider />

                  <Typography variant="subtitle2">Select Series Cover:</Typography>

                  {seriesBooks.length === 0 ? (
                    <Alert severity="info">
                      No books in this series yet. Add books and assign them to "{selectedSeries.name}" to select a cover.
                    </Alert>
                  ) : (
                    <RadioGroup
                      value={selectedSeries.cover_book_id || ""}
                      onChange={(e) => handleSetCover(Number(e.target.value))}
                    >
                      <Stack spacing={2}>
                        {seriesBooks.map((book) => (
                          <FormControlLabel
                            key={book.library_book_id}
                            value={book.book_id}
                            control={<Radio />}
                            label={
                              <Card sx={{ display: 'flex', width: '100%' }}>
                                {getCoverUrl(book) ? (
                                  <CardMedia
                                    component="img"
                                    sx={{ width: 80, objectFit: 'contain' }}
                                    image={getCoverUrl(book)}
                                    alt={book.title}
                                  />
                                ) : (
                                  <Box sx={{ width: 80, flexShrink: 0 }}>
                                    <BookCoverPlaceholder
                                      title={book.title}
                                      width={80}
                                      height={100}
                                      variant="card"
                                    />
                                  </Box>
                                )}
                                <Box sx={{ display: 'flex', flexDirection: 'column', p: 1, flex: 1 }}>
                                  <Typography variant="body2" noWrap>
                                    {book.title}
                                  </Typography>
                                  {book.is_series_cover && (
                                    <Chip label="Current" size="small" color="primary" sx={{ mt: 1, alignSelf: 'flex-start' }} />
                                  )}
                                </Box>
                              </Card>
                            }
                            sx={{ m: 0, alignItems: 'flex-start' }}
                          />
                        ))}
                      </Stack>
                    </RadioGroup>
                  )}
                </Stack>
              )
            )}
          </>
        ) : (
          <Stack direction="row" spacing={2} sx={{ height: 500 }}>
            {/* Left panel - Series list */}
            <Box sx={{ width: 250, borderRight: 1, borderColor: "divider", pr: 2 }}>
            <Stack spacing={1}>
              {isCreating ? (
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Series name"
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="small"
                    onClick={() => createMutation.mutate(newSeriesName)}
                    disabled={!newSeriesName.trim() || createMutation.isPending}
                  >
                    Add
                  </Button>
                  <IconButton size="small" onClick={() => setIsCreating(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreating(true)}
                  variant="outlined"
                  size="small"
                >
                  New Series
                </Button>
              )}
              <Divider />
              <List sx={{ overflow: "auto", maxHeight: 400 }}>
                {seriesList.map((series) => (
                  <ListItemButton
                    key={series.id}
                    selected={selectedSeries?.id === series.id}
                    onClick={() => setSelectedSeries(series)}
                  >
                    <ListItemText primary={series.name} />
                  </ListItemButton>
                ))}
              </List>
            </Stack>
          </Box>

          {/* Right panel - Series details */}
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {selectedSeries ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {editingName ? (
                    <>
                      <TextField
                        size="small"
                        fullWidth
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        autoFocus
                      />
                      <Button size="small" onClick={handleSaveName}>
                        Save
                      </Button>
                      <IconButton size="small" onClick={() => setEditingName(false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        {selectedSeries.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditedName(selectedSeries.name);
                          setEditingName(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteMutation.mutate(selectedSeries.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>

                <Divider />

                <Typography variant="subtitle2">Select Series Cover:</Typography>

                {seriesBooks.length === 0 ? (
                  <Alert severity="info">
                    No books in this series yet. Add books and assign them to "{selectedSeries.name}" to select a cover.
                  </Alert>
                ) : (
                  <RadioGroup
                    value={selectedSeries.cover_book_id || ""}
                    onChange={(e) => handleSetCover(Number(e.target.value))}
                  >
                    <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
                      {seriesBooks.map((book) => (
                        <FormControlLabel
                          key={book.library_book_id}
                          value={book.book_id}
                          control={<Radio />}
                          label={
                            <Card sx={{ width: 150 }}>
                              {getCoverUrl(book) ? (
                                <CardMedia
                                  component="img"
                                  height="200"
                                  image={getCoverUrl(book)}
                                  alt={book.title}
                                  sx={{ objectFit: "contain", bgcolor: "grey.100" }}
                                />
                              ) : (
                                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <BookCoverPlaceholder
                                    title={book.title}
                                    width={150}
                                    height={200}
                                    variant="card"
                                  />
                                </Box>
                              )}
                              <CardActions sx={{ flexDirection: "column", alignItems: "flex-start", p: 1 }}>
                                <Typography variant="caption" noWrap sx={{ width: "100%" }}>
                                  {book.title}
                                </Typography>
                                {book.is_series_cover && (
                                  <Chip label="Current" size="small" color="primary" />
                                )}
                              </CardActions>
                            </Card>
                          }
                          sx={{ m: 0 }}
                        />
                      ))}
                    </Stack>
                  </RadioGroup>
                )}
              </Stack>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                <Typography color="text.secondary">
                  Select a series to manage or create a new one
                </Typography>
              </Stack>
            )}
          </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeriesManagementDialog;
