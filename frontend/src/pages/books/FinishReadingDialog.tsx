import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";

interface FinishReadingDialogProps {
  open: boolean;
  bookTitle: string;
  onClose: () => void;
  onConfirm: (completionDate: string) => Promise<void>;
}

const FinishReadingDialog = ({
  open,
  bookTitle,
  onClose,
  onConfirm
}: FinishReadingDialogProps) => {
  const [completionDate, setCompletionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(completionDate);
      onClose();
    } catch (error) {
      console.error("Failed to mark book as finished:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark as Finished Reading</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mark "{bookTitle}" as finished reading
        </Typography>
        <TextField
          label="Completion Date"
          type="date"
          fullWidth
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="Select the date you finished reading this book"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isSubmitting || !completionDate}
        >
          {isSubmitting ? "Saving..." : "Mark as Finished"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinishReadingDialog;
