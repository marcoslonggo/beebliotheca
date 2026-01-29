import { Library, Plus, Settings, Share2, Users } from "lucide-react";

import { useTheme } from "../ThemeContext";

interface LibraryInfo {
  id: string;
  name: string;
  role: "Owner" | "Member" | "Admin";
  memberCount: number;
  created: string;
}

const mockLibraries: LibraryInfo[] = [
  {
    id: "1",
    name: "Test michele",
    role: "Owner",
    memberCount: 2,
    created: "11/1/2025"
  },
  {
    id: "2",
    name: "test",
    role: "Member",
    memberCount: 2,
    created: "11/3/2025"
  }
];

export const Libraries = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className={`flex-1 min-h-[calc(100vh-4rem)] ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <header className="px-6 py-5 border-b border-[#1f1f1f] flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-[#8CE2D0]">Spaces</p>
          <h2 className="text-2xl font-semibold text-white">Libraries</h2>
          <p className="text-sm text-gray-400">Manage your book libraries and collections.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8CE2D0] text-black font-semibold">
          <Plus className="w-4 h-4" />
          Create library
        </button>
      </header>

      <div className="px-6 py-6 grid gap-5 md:grid-cols-2">
        {mockLibraries.map((library, idx) => (
          <article
            key={library.id}
            className="rounded-3xl border border-[#1f1f1f] bg-[#111111] p-6 relative overflow-hidden shadow-soft-card/10 group"
          >
            <div className="absolute inset-0 opacity-[0.08] bg-gradient-to-br from-[#8CE2D0] to-transparent group-hover:opacity-20 transition-opacity" />
            <div className="relative space-y-4">
              <div className="flex items-start justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs border ${
                    library.role === "Owner"
                      ? "border-[#8CE2D0]/40 text-[#8CE2D0]"
                      : "border-[#C47978]/40 text-[#C47978]"
                  }`}
                >
                  {library.role}
                </span>
                <div className="flex items-center gap-2 text-gray-400">
                  <button className="w-9 h-9 rounded-xl border border-[#1f1f1f] hover:text-white">
                    <Users className="w-4 h-4 mx-auto" />
                  </button>
                  <button className="w-9 h-9 rounded-xl border border-[#1f1f1f] hover:text-white">
                    <Share2 className="w-4 h-4 mx-auto" />
                  </button>
                  <button className="w-9 h-9 rounded-xl border border-[#1f1f1f] hover:text-white">
                    <Settings className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#8CE2D0]/10 border border-[#8CE2D0]/20 flex items-center justify-center text-[#8CE2D0]">
                  <Library className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{library.name}</h3>
                  <p className="text-sm text-gray-400">
                    {library.memberCount} members • Created {library.created}
                  </p>
                </div>
              </div>

              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${
                  idx === 0
                    ? "bg-gradient-to-r from-[#8CE2D0] via-[#C47978] to-[#BC6B6B]"
                    : "bg-gradient-to-r from-[#C47978] via-[#BC6B6B] to-[#8CE2D0]"
                } opacity-40`}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
