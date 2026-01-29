import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Tabs,
  Tab,
  Box,
  IconButton,
  useTheme,
  useMediaQuery
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Book } from "../../types/book";
import BookViewTab from "./BookViewTab";
import BookFormDialog from "./BookFormDialog";
import { createInitialValues, BookFormValues } from "./BookFormDialog";
import { FormikHelpers } from "formik";

interface BookDetailsDialogProps {
  book: Book | null;
  libraryId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (values: BookFormValues, helpers: FormikHelpers<BookFormValues>) => Promise<void>;
  onDelete: () => void;
  onEnrich: () => void;
  onReview?: () => void;
}

const BookDetailsDialog = ({
  book,
  libraryId,
  open,
  onClose,
  onUpdate,
  onDelete,
  onEnrich,
  onReview
}: BookDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Reset to view tab when dialog opens
  const handleClose = () => {
    setActiveTab(0);
    setEditFormOpen(false);
    onClose();
  };

  const handleSwitchToEdit = () => {
    setActiveTab(1);
    setEditFormOpen(true);
  };

  if (!book) return null;

  return (
    <>
      <Dialog
        open={open && activeTab === 0}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
          <Tabs
            value={0}
            sx={{ px: 2 }}
          >
            <Tab label="View" />
            <Tab label="Edit" onClick={handleSwitchToEdit} />
          </Tabs>
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <BookViewTab
            book={book}
            onDelete={() => {
              onDelete();
              handleClose();
            }}
            onEnrich={onEnrich}
            onReview={onReview}
            onEdit={handleSwitchToEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Form in separate dialog */}
      <BookFormDialog
        libraryId={libraryId}
        isEdit={true}
        open={editFormOpen}
        onClose={() => {
          setEditFormOpen(false);
          setActiveTab(0);
        }}
        initialValues={createInitialValues(book)}
        onSubmit={async (values, helpers) => {
          await onUpdate(values, helpers);
          setEditFormOpen(false);
          setActiveTab(0);
        }}
        fullScreen={isMobile}
      />
    </>
  );
};

export default BookDetailsDialog;

