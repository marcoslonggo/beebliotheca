import { useState } from "react";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  listBookClubs,
  getBookClub,
  updateProgress,
  createComment,
  BookClubSummary,
  BookClubDetail,
} from "../../api/bookClubs";
import BookClubFormDialog from "./BookClubFormDialog";
import UpdateProgressSection from "./UpdateProgressSection";
import MemberProgressSection from "./MemberProgressSection";
import MembersSection from "./MembersSection";
import DiscussionSection from "./DiscussionSection";

const BookClubsPage = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<BookClubSummary | null>(null);

  // Fetch all clubs
  const {
    data: clubs = [],
    isLoading: isLoadingClubs,
    error: clubsError,
  } = useQuery({
    queryKey: ["bookClubs"],
    queryFn: listBookClubs,
  });

  // Fetch selected club details
  const {
    data: clubDetail,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: ["bookClub", selectedClubId],
    queryFn: () => getBookClub(selectedClubId!),
    enabled: !!selectedClubId,
  });

  // Auto-select first club when clubs load
  useState(() => {
    if (clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  });

  const handleCreateClub = () => {
    setEditingClub(null);
    setIsFormDialogOpen(true);
  };

  const handleEditClub = () => {
    if (selectedClub) {
      setEditingClub(selectedClub);
      setIsFormDialogOpen(true);
    }
  };

  const handleFormClose = () => {
    setIsFormDialogOpen(false);
    setEditingClub(null);
  };

  const handleFormSuccess = (club: BookClubSummary) => {
    queryClient.invalidateQueries({ queryKey: ["bookClubs"] });
    setSelectedClubId(club.id);
    handleFormClose();
  };

  // Get selected club summary
  const selectedClub = clubs.find((c) => c.id === selectedClubId);

  if (isLoadingClubs) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
      </div>
    );
  }

  if (clubsError) {
    return (
      <div className={`flex-1 min-h-screen flex items-center justify-center ${
        darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"
      }`}>
        <p className="text-red-400">
          Error loading book clubs: {clubsError instanceof Error ? clubsError.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${
        darkMode ? "border-[#2a2a2a]" : "border-gray-200"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl mb-1 font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Book Clubs
            </h1>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Track group reads, discussion progress, and discussions by page.
            </p>
          </div>
          <Button
            onClick={handleCreateClub}
            className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Book Club
          </Button>
        </div>
      </div>

      {clubs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
            <h2 className={`text-xl font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
              No book clubs yet
            </h2>
            <p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Create your first book club to start reading with friends
            </p>
            <Button
              onClick={handleCreateClub}
              className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Book Club
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 grid grid-cols-[350px_1fr] gap-6">
          {/* Your Clubs */}
          <div className="space-y-4">
            <div>
              <h2 className={`mb-3 font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                Your Clubs
              </h2>
              <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Select a club to manage progress and discussions
              </p>
            </div>

            <div className="space-y-3">
              {clubs.map((club, idx) => (
                <div
                  key={club.id}
                  onClick={() => setSelectedClubId(club.id)}
                  className={`rounded-lg p-4 border transition-colors cursor-pointer relative overflow-hidden ${
                    selectedClubId === club.id
                      ? darkMode
                        ? "bg-[#1a2a2a] border-[#8CE2D0] shadow-sm"
                        : "bg-[#8CE2D0]/10 border-[#8CE2D0] shadow-sm"
                      : darkMode
                        ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#8CE2D0]/30"
                        : "bg-white border-gray-200 hover:border-[#8CE2D0]/50"
                  }`}
                >
                  <div className="absolute top-2 right-2 opacity-5">
                    <svg viewBox="0 0 50 50" className="w-12 h-12">
                      <polygon
                        points="25,2 45,15 45,35 25,48 5,35 5,15"
                        fill="currentColor"
                        className="text-[#8CE2D0]"
                      />
                    </svg>
                  </div>
                  <h3 className={`mb-1 relative z-10 font-medium ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}>
                    {club.name}
                  </h3>
                  <p className={`text-sm relative z-10 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {club.member_count} {club.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Club Details */}
          <div className="space-y-6">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className={darkMode ? "text-[#8CE2D0]" : "text-gray-600"} />
              </div>
            ) : clubDetail && selectedClub ? (
              <>
                {/* Club Header */}
                <div className={`rounded-lg p-6 border ${
                  darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className={`text-xl mb-2 font-semibold ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {clubDetail.club.name}
                      </h2>
                      {clubDetail.club.description && (
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {clubDetail.club.description}
                        </p>
                      )}
                    </div>
                    {user && selectedClub.owner_id === user.id && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={handleEditClub}
                          className={`transition-colors ${
                            darkMode
                              ? "text-gray-400 hover:text-white"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          title="Edit club"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Update Progress */}
                <UpdateProgressSection clubId={clubDetail.club.id} />

                {/* Member Progress */}
                <MemberProgressSection progress={clubDetail.progress} />

                {/* Members */}
                <MembersSection
                  clubId={clubDetail.club.id}
                  members={clubDetail.members}
                  ownerId={clubDetail.club.owner_id}
                />

                {/* Discussion */}
                <DiscussionSection
                  clubId={clubDetail.club.id}
                  comments={clubDetail.comments}
                />
              </>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  Select a book club to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <BookClubFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleFormClose}
        club={editingClub}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default BookClubsPage;
