import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { addListItem } from "../../api/lists";

interface AddExternalItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  onSuccess: () => void;
}

interface FormState {
  title: string;
  author: string;
  isbn: string;
  cover_image_url: string;
  notes: string;
}

const defaultState: FormState = {
  title: "",
  author: "",
  isbn: "",
  cover_image_url: "",
  notes: "",
};

const AddExternalItemDialog = ({ isOpen, onClose, listId, onSuccess }: AddExternalItemDialogProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const [formData, setFormData] = useState<FormState>(defaultState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (isOpen) return;
    setFormData(defaultState);
    setErrors({});
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      await addListItem(listId, {
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        isbn: formData.isbn.trim() || null,
        notes: formData.notes.trim() || null,
        cover_image_url: formData.cover_image_url.trim() || null,
        item_type: "external",
      });
    },
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData(defaultState);
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.title.trim()) {
      nextErrors.title = "Title is required";
    }
    if (formData.cover_image_url && !/^https?:\/\//i.test(formData.cover_image_url.trim())) {
      nextErrors.cover_image_url = "Cover URL must start with http:// or https://";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    await mutation.mutateAsync();
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Custom Entry"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mutation.error && (
          <div
            className={`p-3 rounded-lg ${
              darkMode
                ? "bg-red-900/20 border border-red-700/50"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <p className="text-red-400 text-sm">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to add item"}
            </p>
          </div>
        )}

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
            placeholder="Enter book or article title"
            className={errors.title ? "border-red-500" : ""}
            autoFocus
          />
          {errors.title && (
            <p className="text-red-400 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Author
            </label>
            <Input
              value={formData.author}
              onChange={(e) => handleChange("author", e.target.value)}
              placeholder="Author name (optional)"
            />
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              ISBN / Identifier
            </label>
            <Input
              value={formData.isbn}
              onChange={(e) => handleChange("isbn", e.target.value)}
              placeholder="ISBN or any identifier (optional)"
            />
          </div>
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Cover Image URL
          </label>
          <Input
            value={formData.cover_image_url}
            onChange={(e) => handleChange("cover_image_url", e.target.value)}
            placeholder="https://example.com/cover.jpg"
            className={errors.cover_image_url ? "border-red-500" : ""}
          />
          {errors.cover_image_url && (
            <p className="text-red-400 text-sm mt-1">{errors.cover_image_url}</p>
          )}
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
            placeholder="Optional notes or links about this entry"
            className={
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                : "bg-gray-50 border-gray-200 text-gray-900"
            }
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Adding..." : "Add Entry"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default AddExternalItemDialog;
