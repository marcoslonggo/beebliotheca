import { useState } from "react";
import { Plus, Users, Share2, Settings, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { listLibraries, deleteLibrary } from "../../api/libraries";
import { Library } from "../../types/library";
import LibraryFormDialog from "./LibraryFormDialog";
import MembersDialog from "./MembersDialog";
import ShareLibraryDialog from "./ShareLibraryDialog";

const LibrariesPage = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  // Fetch libraries
  const { data: libraries = [], isLoading } = useQuery({
    queryKey: ["libraries"],
    queryFn: listLibraries,
  });

  // Delete library mutation
  const deleteMutation = useMutation({
    mutationFn: (libraryId: string) => deleteLibrary(libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
    },
  });

  const handleCreateLibrary = () => {
    setSelectedLibrary(null);
    setIsFormDialogOpen(true);
  };

  const handleEditLibrary = (library: Library, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLibrary(library);
    setIsFormDialogOpen(true);
  };

  const handleDeleteLibrary = async (library: Library, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${library.name}"?`)) {
      await deleteMutation.mutateAsync(library.id);
    }
  };

  const handleManageMembers = (library: Library, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLibrary(library);
    setIsMembersDialogOpen(true);
  };

  const handleShareLibrary = (library: Library, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLibrary(library);
    setIsShareDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "owner") {
      return "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/40";
    }
    return "bg-[#C47978]/20 text-[#C47978] border-[#C47978]/40";
  };

  const getHoneycombColor = (index: number) => {
    return index % 2 === 0 ? "text-[#8CE2D0]" : "text-[#C47978]";
  };

  if (isLoading) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Loading libraries...</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between ${
        darkMode ? "border-[#2a2a2a]" : "border-gray-200"
      }`}>
        <div>
          <h1 className={`text-2xl font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Libraries
          </h1>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Manage your book libraries and collections
          </p>
        </div>
        <Button onClick={handleCreateLibrary}>
          <Plus className="w-4 h-4 mr-2" />
          Create Library
        </Button>
      </div>

      {/* Libraries Grid */}
      <div className="px-6 py-6">
        {libraries.length === 0 ? (
          <div className={`text-center py-12 rounded-lg border ${
            darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
          }`}>
            <p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              No libraries yet. Create your first library to get started!
            </p>
            <Button onClick={handleCreateLibrary}>
              <Plus className="w-4 h-4 mr-2" />
              Create Library
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {libraries.map((library, index) => (
              <div
                key={library.id}
                className={`rounded-lg p-6 border hover:border-opacity-50 transition-all cursor-pointer relative overflow-hidden group ${
                  darkMode
                    ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#8CE2D0]/30"
                    : "bg-white border-gray-200 hover:border-[#8CE2D0]/50"
                }`}
              >
                {/* Honeycomb decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon
                      points="50,5 90,30 90,70 50,95 10,70 10,30"
                      fill="currentColor"
                      className={getHoneycombColor(index)}
                    />
                  </svg>
                </div>

                {/* Role Badge and Actions */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`${getRoleBadgeColor(library.user_role || "member")} border capitalize`}
                    >
                      {library.user_role || "Member"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleManageMembers(library, e)}
                      className={`transition-colors ${
                        darkMode ? "text-gray-400 hover:text-[#8CE2D0]" : "text-gray-500 hover:text-[#8CE2D0]"
                      }`}
                      title="Manage Members"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleShareLibrary(library, e)}
                      className={`transition-colors ${
                        darkMode ? "text-gray-400 hover:text-[#8CE2D0]" : "text-gray-500 hover:text-[#8CE2D0]"
                      }`}
                      title="Share Library"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleEditLibrary(library, e)}
                      className={`transition-colors ${
                        darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                      }`}
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {library.user_role === "owner" && (
                      <button
                        onClick={(e) => handleDeleteLibrary(library, e)}
                        className={`transition-colors ${
                          darkMode ? "text-gray-400 hover:text-ember" : "text-gray-500 hover:text-ember"
                        }`}
                        title="Delete Library"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Library Name */}
                <h3 className={`text-xl font-semibold mb-4 relative z-10 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  {library.name}
                </h3>

                {/* Description */}
                {library.description && (
                  <p className={`text-sm mb-4 line-clamp-2 relative z-10 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {library.description}
                  </p>
                )}

                {/* Footer Info */}
                <div className={`flex items-center gap-4 relative z-10 text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  <div>Created {formatDate(library.created_at)}</div>
                </div>

                {/* Hover effect border */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8CE2D0] via-[#C47978] to-[#BC6B6B] opacity-0 group-hover:opacity-30 transition-opacity"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <LibraryFormDialog
        open={isFormDialogOpen}
        library={selectedLibrary}
        onClose={() => {
          setIsFormDialogOpen(false);
          setSelectedLibrary(null);
        }}
      />

      <MembersDialog
        open={isMembersDialogOpen}
        library={selectedLibrary}
        onClose={() => {
          setIsMembersDialogOpen(false);
          setSelectedLibrary(null);
        }}
      />

      <ShareLibraryDialog
        open={isShareDialogOpen}
        library={selectedLibrary}
        onClose={() => {
          setIsShareDialogOpen(false);
          setSelectedLibrary(null);
        }}
      />
    </div>
  );
};

export default LibrariesPage;
