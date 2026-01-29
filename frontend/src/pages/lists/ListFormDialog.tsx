import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import {
  createList,
  updateList,
  ReadingListSummary,
} from "../../api/lists";
import { ListVisibility } from "../../types/list";

interface ListFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  list?: ReadingListSummary | null;
  onSuccess: (list: ReadingListSummary) => void;
}

interface FormData {
  title: string;
  description: string;
  visibility: ListVisibility;
}

const ListFormDialog = ({
  isOpen,
  onClose,
  list,
  onSuccess,
}: ListFormDialogProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    visibility: "private",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Initialize form data when list changes
  useEffect(() => {
    if (list) {
      setFormData({
        title: list.title,
        description: list.description || "",
        visibility: list.visibility,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        visibility: "private",
      });
    }
    setErrors({});
  }, [list, isOpen]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      createList({
        title: data.title,
        description: data.description || null,
        visibility: data.visibility,
      }),
    onSuccess: (newList) => {
      onSuccess(newList as unknown as ReadingListSummary);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      updateList(list!.id, {
        title: data.title,
        description: data.description || null,
        visibility: data.visibility,
      }),
    onSuccess: (updatedList) => {
      onSuccess(updatedList as unknown as ReadingListSummary);
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = "List title is required";
    } else if (formData.title.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
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
      if (list) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error saving list:", error);
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
      title={list ? "Edit Reading List" : "New Reading List"}
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
              {error instanceof Error ? error.message : "Failed to save list"}
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Title <span className="text-red-400">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Enter list title"
            className={errors.title ? "border-red-500" : ""}
            autoFocus
          />
          {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
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
            placeholder="Enter a description for this list (optional)"
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

        {/* Visibility */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Visibility
          </label>
          <Select
            value={formData.visibility}
            onChange={(e) => handleChange("visibility", e.target.value as ListVisibility)}
          >
            <option value="private">Private - Only you can see this list</option>
            <option value="shared">Shared - People you invite can see this list</option>
            <option value="public">Public - Anyone can see this list</option>
          </Select>
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
            {isLoading ? "Saving..." : list ? "Update List" : "Create List"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default ListFormDialog;
