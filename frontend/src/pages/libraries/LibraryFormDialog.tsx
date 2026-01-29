import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { createLibrary, updateLibrary } from "../../api/libraries";
import { Library } from "../../types/library";
import { useTheme } from "../../contexts/ThemeContext";

interface LibraryFormDialogProps {
  open: boolean;
  library: Library | null;
  onClose: () => void;
}

const LibraryFormDialog = ({ open, library, onClose }: LibraryFormDialogProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setName(library?.name || "");
      setDescription(library?.description || "");
      setErrors({});
    }
  }, [open, library]);

  const createMutation = useMutation({
    mutationFn: createLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      updateLibrary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Library name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (library) {
        await updateMutation.mutateAsync({
          id: library.id,
          data: { name, description: description || undefined },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description: description || undefined,
        });
      }
    } catch (error: any) {
      console.error("Failed to save library:", error);
      alert(`Failed to save library: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={library ? "Edit Library" : "Create New Library"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Library Name <span className="text-ember">*</span>
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Library"
            disabled={isLoading}
            autoFocus
          />
          {errors.name && <p className="text-ember text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label
            htmlFor="description"
            className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Description (optional)
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of this library..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : library ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default LibraryFormDialog;
