import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { X, Mail, Clock } from "lucide-react";
import { Library } from "../../types/library";
import { createInvitation, listLibraryInvitations, cancelInvitation } from "../../api/invitations";

interface ShareLibraryDialogProps {
  open: boolean;
  library: Library | null;
  onClose: () => void;
}

const ShareLibraryDialog = ({ open, library, onClose }: ShareLibraryDialogProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setUsername("");
      setRole("viewer");
      setError("");
    }
  }, [open]);

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["library-invitations", library?.id],
    queryFn: () => listLibraryInvitations(library!.id),
    enabled: open && !!library,
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvitation(library!.id, { invitee_username: username, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-invitations", library?.id] });
      setUsername("");
      setRole("viewer");
      setError("");
    },
    onError: (error: any) => {
      setError(error?.response?.data?.detail || "Failed to send invitation");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-invitations", library?.id] });
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      await inviteMutation.mutateAsync();
    } catch (err) {
      // Error handled in onError
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm("Cancel this invitation?")) return;

    try {
      await cancelMutation.mutateAsync(invitationId);
    } catch (error: any) {
      console.error("Failed to cancel invitation:", error);
      alert(`Failed to cancel invitation: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" };
      case "accepted":
        return { label: "Accepted", className: "bg-green-500/20 text-green-500 border-green-500/30" };
      case "declined":
        return { label: "Declined", className: "bg-red-500/20 text-red-500 border-red-500/30" };
      case "cancelled":
        return { label: "Cancelled", className: "bg-gray-500/20 text-gray-500 border-gray-500/30" };
      case "expired":
        return { label: "Expired", className: "bg-gray-500/20 text-gray-500 border-gray-500/30" };
      default:
        return { label: status, className: "" };
    }
  };

  if (!library) return null;

  const isOwner = library.user_role === "owner";
  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");

  return (
    <Dialog open={open} onClose={onClose} title={`Share - ${library.name}`}>
      <div className="space-y-6">
        {/* Invite Form */}
        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter username to invite"
                disabled={inviteMutation.isPending}
              />
              {error && <p className="text-ember text-sm mt-1">{error}</p>}
            </div>

            <div>
              <label
                htmlFor="role"
                className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Role
              </label>
              <Select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                options={[
                  { value: "viewer", label: "Viewer - Can view books" },
                  { value: "admin", label: "Admin - Can manage library" },
                ]}
                disabled={inviteMutation.isPending}
              />
            </div>

            <Button type="submit" disabled={inviteMutation.isPending} className="w-full">
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        )}

        {/* Invitations List */}
        <div>
          <h3 className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Pending Invitations
          </h3>

          {isLoading ? (
            <div className="text-center py-4">
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Loading invitations...</p>
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className={`p-4 rounded-lg border text-center ${
              darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"
            }`}>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                No pending invitations
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => {
                const statusBadge = getStatusBadge(invitation.status);
                const expiresAt = new Date(invitation.expires_at);
                const isExpired = expiresAt < new Date();

                return (
                  <div
                    key={invitation.id}
                    className={`p-3 rounded-lg border ${
                      darkMode ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-2 rounded ${
                          darkMode ? "bg-[#2a2a2a]" : "bg-gray-200"
                        }`}>
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {invitation.invitee_username}
                            </p>
                            <Badge size="sm" className="capitalize">
                              {invitation.role}
                            </Badge>
                            <Badge size="sm" className={statusBadge.className}>
                              {statusBadge.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                              {isExpired
                                ? "Expired"
                                : `Expires ${expiresAt.toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isOwner && invitation.status === "pending" && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className={`p-2 rounded transition-colors ${
                            darkMode
                              ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-ember"
                              : "hover:bg-gray-200 text-gray-500 hover:text-ember"
                          }`}
                          title="Cancel invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isOwner && (
          <div className={`p-3 rounded text-sm ${
            darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"
          }`}>
            Only library owners can send invitations
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ShareLibraryDialog;
