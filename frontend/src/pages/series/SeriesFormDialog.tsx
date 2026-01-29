import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useLibrary } from "../../contexts/LibraryContext";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { createSeries, updateSeries, Series } from "../../api/series";

interface SeriesFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  series?: Series | null;
  onSuccess: (series: Series) => void;
}

interface FormData {
  name: string;
  description: string;
  publication_status: "in_progress" | "finished";
}

const SeriesFormDialog = ({ isOpen, onClose, series, onSuccess }: SeriesFormDialogProps) => {
  const { theme } = useTheme();
  const { currentLibrary } = useLibrary();
  const darkMode = theme === "dark";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    publication_status: "in_progress",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Initialize form data when series changes
  useEffect(() => {
    if (series) {
      setFormData({
        name: series.name,
        description: series.description || "",
        publication_status: series.publication_status,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        publication_status: "in_progress",
      });
    }
    setErrors({});
  }, [series, isOpen]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      createSeries(currentLibrary!.id, {
        name: data.name,
        description: data.description || null,
        publication_status: data.publication_status,
      }),
    onSuccess: (newSeries) => {
      onSuccess(newSeries);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      updateSeries(currentLibrary!.id, series!.id, {
        name: data.name,
        description: data.description || null,
        publication_status: data.publication_status,
      }),
    onSuccess: (updatedSeries) => {
      onSuccess(updatedSeries);
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Series name is required";
    } else if (formData.name.length > 200) {
      newErrors.name = "Series name must be less than 200 characters";
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
      if (series) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error saving series:", error);
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
      title={series ? "Edit Series" : "New Series"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error message */}
        {error && (
          <div className={`p-3 rounded-lg ${
            darkMode ? "bg-red-900/20 border border-red-700/50" : "bg-red-50 border border-red-200"
          }`}>
            <p className="text-red-400 text-sm">
              {error instanceof Error ? error.message : "Failed to save series"}
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Series Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter series name"
            className={errors.name ? "border-red-500" : ""}
            autoFocus
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Enter a description for this series (optional)"
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

        {/* Publication Status */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Publication Status
          </label>
          <Select
            value={formData.publication_status}
            onChange={(e) => handleChange("publication_status", e.target.value as "in_progress" | "finished")}
          >
            <option value="in_progress">In Progress</option>
            <option value="finished">Complete</option>
          </Select>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Mark as "Complete" if the series has been fully published
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
            {isLoading ? "Saving..." : series ? "Update Series" : "Create Series"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default SeriesFormDialog;
