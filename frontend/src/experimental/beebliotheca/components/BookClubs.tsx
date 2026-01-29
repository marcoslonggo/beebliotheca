import { Plus, Users } from "lucide-react";

import { useTheme } from "../ThemeContext";

export const BookClubs = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  const clubs = [{ name: "Test book club", members: 3 }];

  return (
    <div className={`flex-1 min-h-[calc(100vh-4rem)] ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <div className="px-6 py-5 border-b border-[#1f1f1f] flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-[#8CE2D0]">Community</p>
          <h2 className="text-2xl font-semibold text-white">Book Clubs</h2>
          <p className="text-sm text-gray-400">
            Track group reads, meeting notes, and discussion prompts.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8CE2D0] text-black font-semibold">
          <Plus className="w-4 h-4" />
          New club
        </button>
      </div>

      <div className="px-6 py-6 grid grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          {clubs.map((club) => (
            <div
              key={club.name}
              className="p-4 rounded-2xl border border-[#1f1f1f] bg-[#121212] relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.08] bg-gradient-to-br from-[#8CE2D0] to-transparent" />
              <div className="relative">
                <h3 className="text-lg font-semibold">{club.name}</h3>
                <p className="text-sm text-gray-400">{club.members} members</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 shadow-soft-card/10">
            <h3 className="text-xl font-semibold mb-2">Test book club</h3>
            <p className="text-sm text-gray-400">
              Here is the description for the current read. Use this space to align reading cadence
              and keep everyone in sync.
            </p>
          </section>

          <section className="rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] p-6">
            <h4 className="text-lg font-semibold mb-4">Meeting checklist</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl border border-[#1f1f1f] flex items-center justify-center">
                  1
                </span>
                Confirm pages for upcoming session
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl border border-[#1f1f1f] flex items-center justify-center">
                  2
                </span>
                Post the discussion prompt
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl border border-[#1f1f1f] flex items-center justify-center">
                  3
                </span>
                Track attendance & notes
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6">
            <div className="flex items-center gap-2 text-[#8CE2D0] mb-3">
              <Users className="w-4 h-4" />
              Members
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">You — Never tried Added (Michele, 8/3/27)</p>
              <p className="text-gray-500">Invite more readers to unlock insights.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
