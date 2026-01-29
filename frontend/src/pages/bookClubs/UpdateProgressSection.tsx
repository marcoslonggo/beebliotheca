import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { updateProgress } from "../../api/bookClubs";

interface UpdateProgressSectionProps {
  clubId: string;
}

const UpdateProgressSection = ({ clubId }: UpdateProgressSectionProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState("");
  const [pagesTotal, setPagesTotal] = useState("");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProgress(clubId, {
        current_page: parseInt(currentPage) || 0,
        pages_total: pagesTotal ? parseInt(pagesTotal) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookClub", clubId] });
      setCurrentPage("");
      setPagesTotal("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage) {
      updateMutation.mutate();
    }
  };

  return (
    <div
      className={`rounded-lg p-6 border ${
        darkMode
          ? "bg-[#1a1a1a] border-[#2a2a2a]"
          : "bg-white border-gray-200"
      }`}
    >
      <h3
        className={`mb-4 font-semibold ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Update Progress
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className={`text-sm mb-2 block ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Current page
          </label>
          <Input
            type="number"
            min="0"
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value)}
            placeholder="Enter current page number"
            className={
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                : "bg-gray-50 border-gray-200 text-gray-900"
            }
          />
        </div>

        <div>
          <label
            className={`text-sm mb-2 block ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Override total pages (optional)
          </label>
          <Input
            type="number"
            min="1"
            value={pagesTotal}
            onChange={(e) => setPagesTotal(e.target.value)}
            placeholder="Enter total pages"
            className={
              darkMode
                ? "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                : "bg-gray-50 border-gray-200 text-gray-900"
            }
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
          disabled={!currentPage || updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Progress"}
        </Button>

        {updateMutation.error && (
          <p className="text-red-400 text-sm">
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : "Failed to update progress"}
          </p>
        )}
      </form>
    </div>
  );
};

export default UpdateProgressSection;
