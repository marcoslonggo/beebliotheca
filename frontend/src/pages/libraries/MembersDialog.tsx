import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog } from "../../components/ui/Dialog";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Trash2, User } from "lucide-react";
import { Library } from "../../types/library";
import { listLibraryMembers, updateLibraryMember, removeLibraryMember } from "../../api/libraries";

interface MembersDialogProps {
  open: boolean;
  library: Library | null;
  onClose: () => void;
}

const MembersDialog = ({ open, library, onClose }: MembersDialogProps) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["library-members", library?.id],
    queryFn: () => listLibraryMembers(library!.id),
    enabled: open && !!library,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" | "viewer" }) =>
      updateLibraryMember(library!.id, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-members", library?.id] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeLibraryMember(library!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-members", library?.id] });
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
    },
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole as any });
    } catch (error: any) {
      console.error("Failed to update role:", error);
      alert(`Failed to update role: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!window.confirm(`Remove ${username} from this library?`)) return;

    try {
      await removeMemberMutation.mutateAsync(userId);
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      alert(`Failed to remove member: ${error?.response?.data?.detail || error.message}`);
    }
  };

  if (!library) return null;

  const isOwner = library.user_role === "owner";
  const currentUserId = user?.id;

  return (
    <Dialog open={open} onClose={onClose} title={`Members - ${library.name}`}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>No members found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const canEdit = isOwner && !isCurrentUser && member.role !== "owner";
              const canRemove = isOwner && !isCurrentUser && member.role !== "owner";

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      darkMode ? "bg-[#2a2a2a]" : "bg-gray-200"
                    }`}>
                      <User className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {member.full_name || member.username}
                        </h4>
                        {isCurrentUser && (
                          <Badge size="sm" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {member.email}
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Role and Actions */}
                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                          options={[
                            { value: "admin", label: "Admin" },
                            { value: "member", label: "Member" },
                            { value: "viewer", label: "Viewer" },
                          ]}
                          className="w-32"
                        />
                      ) : (
                        <Badge
                          className={`capitalize ${
                            member.role === "owner"
                              ? "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/40"
                              : ""
                          }`}
                        >
                          {member.role}
                        </Badge>
                      )}

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.username)}
                          className={`p-2 rounded transition-colors ${
                            darkMode
                              ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-ember"
                              : "hover:bg-gray-200 text-gray-500 hover:text-ember"
                          }`}
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isOwner && (
          <div className={`p-3 rounded text-sm ${
            darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"
          }`}>
            Only library owners can manage members
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default MembersDialog;
