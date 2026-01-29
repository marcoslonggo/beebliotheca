import { Info, Plus } from "lucide-react";
import { useState } from "react";

import { useTheme } from "../ThemeContext";

interface ReadingList {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  overlook: number;
  isShared: boolean;
}

const mockLists: ReadingList[] = [
  {
    id: "1",
    name: "Test list",
    description: "Here is the description",
    itemCount: 0,
    overlook: 1,
    isShared: true
  }
];

export const ReadingLists = () => {
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className={`flex-1 min-h-[calc(100vh-4rem)] ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-[#8CE2D0]">Collections</p>
          <h2 className="text-2xl font-semibold text-white">Reading Lists</h2>
          <p className="text-sm text-gray-400">Create, share, and track curated reading lists.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#8CE2D0] text-black rounded-xl font-semibold">
          <Plus className="w-4 h-4" />
          New list
        </button>
      </div>

      <div className="px-6 py-6 grid grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          {mockLists.map((list) => (
            <div
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`p-4 rounded-2xl border cursor-pointer relative overflow-hidden transition-colors ${
                selectedList === list.id ? "border-[#8CE2D0] bg-[#1a2a2a]" : "border-[#1f1f1f] bg-[#121212]"
              }`}
            >
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-gradient-to-br from-[#8CE2D0] via-transparent to-transparent" />
              <div className="relative space-y-2">
                <h3 className="text-lg font-semibold">{list.name}</h3>
                <p className="text-sm text-gray-400">{list.description}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full border border-[#2a2a2a] text-gray-300">
                    {list.itemCount} items
                  </span>
                  <span className="px-3 py-1 rounded-full border border-[#2a2a2a] text-gray-300">
                    {list.overlook} overlook
                  </span>
                  {list.isShared ? (
                    <span className="px-3 py-1 rounded-full border border-[#C47978]/40 text-[#C47978]">
                      shared
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <svg key={idx} viewBox="0 0 100 100" className="w-16 h-16 text-[#8CE2D0]">
                    <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="relative z-10 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#8CE2D0]/30 flex items-center justify-center">
                <Info className="w-8 h-8 text-[#8CE2D0]" />
              </div>
              <p className="text-[#8CE2D0] text-sm">Select a list to view details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
