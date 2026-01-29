import { Info, Plus, Search } from "lucide-react";
import { useState } from "react";

import { useTheme } from "../ThemeContext";

interface SeriesItem {
  id: string;
  name: string;
  status: string;
  bookCount: number;
  isComplete: boolean;
}

const mockSeries: SeriesItem[] = [
  {
    id: "1",
    name: "Test series name",
    status: "In progress",
    bookCount: 0,
    isComplete: false
  },
  {
    id: "2",
    name: "Test series 2",
    status: "In progress",
    bookCount: 0,
    isComplete: false
  }
];

export const Series = () => {
  const [selectedSeries, setSelectedSeries] = useState<string>("1");
  const currentSeries = mockSeries.find((series) => series.id === selectedSeries);
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className={`flex-1 min-h-[calc(100vh-4rem)] ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <header className="px-6 py-5 border-b border-[#1f1f1f] flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-8 h-8 text-[#8CE2D0]">
          <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" />
        </svg>
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-[#8CE2D0]">Series</p>
          <h2 className="text-2xl font-semibold text-white">Series</h2>
        </div>
      </header>

      <div className="grid grid-cols-[320px_1fr]">
        <aside className="border-r border-[#1f1f1f] bg-[#0c0c0c] p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#1f1f1f] bg-[#111] text-sm"
              placeholder="Search series..."
            />
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#8CE2D0] text-black font-semibold">
            <Plus className="w-4 h-4" />
            New series
          </button>
          <div className="space-y-2">
            {mockSeries.map((series) => (
              <div
                key={series.id}
                onClick={() => setSelectedSeries(series.id)}
                className={`p-3 rounded-2xl cursor-pointer border ${
                  selectedSeries === series.id ? "border-[#8CE2D0] bg-[#1a2a2a]" : "border-transparent bg-[#111]"
                }`}
              >
                <p className="text-sm font-semibold">{series.name}</p>
                <p className="text-xs text-gray-500">{series.status}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="p-6">
          {currentSeries ? (
            <div className="max-w-3xl space-y-6">
              <section className="rounded-3xl border border-[#1f1f1f] bg-[#111111] p-6 shadow-soft-card/10 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08] bg-gradient-to-br from-[#8CE2D0] to-transparent" />
                <div className="relative">
                  <h3 className="text-2xl font-semibold">{currentSeries.name}</h3>
                  <div className="flex items-center gap-2 mt-3 text-xs uppercase">
                    <span className="px-3 py-1 rounded-full border border-blue-500/40 text-blue-300">
                      {currentSeries.status}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-[#BC6B6B]/40 text-[#BC6B6B]">
                      {currentSeries.isComplete ? "Complete" : "Not series yet"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#1f1f1f] bg-[#0f0f0f] p-6 space-y-3">
                <div className="flex items-center gap-2 text-[#8CE2D0]">
                  <Info className="w-4 h-4" />
                  Books in series
                </div>
                <p className="text-sm text-gray-300">
                  No books in this series yet. Add books and assign them to "{currentSeries.name}" in
                  the Books page.
                </p>
              </section>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a series to view details
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
