import { useTheme } from "../../contexts/ThemeContext";
import { BookClubProgress } from "../../types/bookClub";

interface MemberProgressSectionProps {
  progress: BookClubProgress[];
}

const MemberProgressSection = ({ progress }: MemberProgressSectionProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

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
        Member Progress
      </h3>

      {progress.length === 0 ? (
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          No progress updates yet. Start reading and track your progress!
        </p>
      ) : (
        <div className="space-y-3">
          {progress.map((p) => {
            const percentage = p.pages_total
              ? Math.round((p.current_page / p.pages_total) * 100)
              : null;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg ${
                  darkMode ? "bg-[#0a0a0a]" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p
                    className={`text-sm font-medium ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {p.user_id}
                  </p>
                  <p
                    className={`text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Page {p.current_page}
                    {p.pages_total && ` of ${p.pages_total}`}
                  </p>
                  {percentage !== null && (
                    <div className="flex-1 max-w-xs">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8CE2D0] transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {percentage !== null && (
                    <p
                      className={`text-xs ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {percentage}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberProgressSection;
