import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import {
  createBookClub,
  updateBookClub,
  BookClubSummary,
} from "../../api/bookClubs";

interface BookClubFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  club?: BookClubSummary | null;
  onSuccess: (club: BookClubSummary) => void;
}

interface FormData {
  name: string;
  description: string;
}

const BookClubFormDialog = ({
  isOpen,
  onClose,
  club,
  onSuccess,
}: BookClubFormDialogProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Initialize form data when club changes
  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name,
        description: club.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
    setErrors({});
  }, [club, isOpen]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      createBookClub({
        name: data.name,
        description: data.description || null,
      }),
    onSuccess: (newClub) => {
      onSuccess(newClub as unknown as BookClubSummary);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      updateBookClub(club!.id, {
        name: data.name,
        description: data.description || null,
      }),
    onSuccess: (updatedClub) => {
      onSuccess(updatedClub as unknown as BookClubSummary);
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Club name is required";
    } else if (formData.name.length > 200) {
      newErrors.name = "Club name must be less than 200 characters";
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = "Description must be less than 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (club) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error saving book club:", error);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={club ? "Edit Book Club" : "New Book Club"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error message */}
        {error && (
          <div
            className={`p-3 rounded-lg ${
              darkMode
                ? "bg-red-900/20 border border-red-700/50"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p className="text-red-400 text-sm">
              {error instanceof Error ? error.message : "Failed to save book club"}
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Club Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter club name"
            className={errors.name ? "border-red-500" : ""}
            autoFocus
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Enter a description for this book club (optional)"
            rows={3}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description}</p>
          )}
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            {formData.description.length}/1000 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
            disabled={isLoading}
          >
            {isLoading
              ? "Saving..."
              : club
                ? "Update Club"
                : "Create Club"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default BookClubFormDialog;
