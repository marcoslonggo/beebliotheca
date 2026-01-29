import { Users } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { BookClubMember } from "../../types/bookClub";

interface MembersSectionProps {
  clubId: string;
  members: BookClubMember[];
  ownerId: string;
}

const MembersSection = ({ clubId, members, ownerId }: MembersSectionProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const darkMode = theme === "dark";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "owner") {
      return darkMode
        ? "bg-[#8CE2D0]/20 text-[#8CE2D0] border-[#8CE2D0]/40"
        : "bg-[#8CE2D0]/20 text-[#6ab3a3] border-[#8CE2D0]/40";
    } else if (role === "moderator") {
      return darkMode
        ? "bg-[#C47978]/20 text-[#C47978] border-[#C47978]/40"
        : "bg-[#C47978]/20 text-[#a86160] border-[#C47978]/40";
    }
    return darkMode
      ? "bg-gray-700/30 text-gray-400 border-gray-600/50"
      : "bg-gray-200/50 text-gray-600 border-gray-300/50";
  };

  return (
    <div
      className={`rounded-lg p-6 border relative overflow-hidden ${
        darkMode
          ? "bg-[#1a1a1a] border-[#2a2a2a]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,5 90,30 90,70 50,95 10,70 10,30"
            fill="currentColor"
            className="text-[#C47978]"
          />
        </svg>
      </div>

      <h3
        className={`mb-4 flex items-center gap-2 font-semibold ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        <Users className="w-4 h-4" />
        Members
      </h3>

      {members.length === 0 ? (
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          No members yet.
        </p>
      ) : (
        <div className="space-y-3 relative z-10">
          {members.map((member) => (
            <div
              key={member.id}
              className={`flex items-start justify-between p-3 rounded-lg ${
                darkMode ? "bg-[#0a0a0a]" : "bg-gray-50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className={`text-sm font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {member.user_id}
                    {user && member.user_id === user.id && (
                      <span
                        className={`ml-2 text-xs ${
                          darkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        (You)
                      </span>
                    )}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeColor(
                      member.role
                    )}`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Joined {formatDate(member.joined_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembersSection;
