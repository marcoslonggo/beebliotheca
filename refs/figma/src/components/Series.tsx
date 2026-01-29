import { Plus, Search, Edit, Trash2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useState } from 'react';

interface SeriesItem {
  id: string;
  name: string;
  status: string;
  bookCount: number;
  isComplete: boolean;
}

const mockSeries: SeriesItem[] = [
  {
    id: '1',
    name: 'Test series name',
    status: 'In Progress',
    bookCount: 0,
    isComplete: false
  },
  {
    id: '2',
    name: 'Test series 2',
    status: 'In Progress',
    bookCount: 0,
    isComplete: false
  }
];

export function Series() {
  const [selectedSeries, setSelectedSeries] = useState<string>('1');
  const currentSeries = mockSeries.find(s => s.id === selectedSeries);

  return (
    <div className="flex-1 bg-[#0f0f0f] min-h-screen">
      <div className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <svg viewBox="0 0 100 100" className="w-6 h-6">
            <polygon 
              points="50,5 90,30 90,70 50,95 10,70 10,30" 
              fill="currentColor" 
              className="text-[#8CE2D0]" 
            />
          </svg>
          <h1 className="text-white text-2xl">Series</h1>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr]">
        {/* Series List Sidebar */}
        <div className="border-r border-[#2a2a2a] bg-[#0a0a0a] p-4 space-y-3">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search series..." 
              className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
            />
          </div>

          <Button className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
            <Plus className="w-4 h-4 mr-2" />
            New Series
          </Button>

          <div className="space-y-2 mt-4">
            {mockSeries.map((series) => (
              <div
                key={series.id}
                onClick={() => setSelectedSeries(series.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all relative overflow-hidden ${
                  selectedSeries === series.id
                    ? 'bg-[#1a2a2a] border-l-2 border-[#8CE2D0]'
                    : 'bg-[#1a1a1a] hover:bg-[#1a2020]'
                }`}
              >
                <div className="absolute top-0 right-0 w-12 h-12 opacity-5">
                  <svg viewBox="0 0 50 50" className="w-full h-full">
                    <polygon points="25,2 45,15 45,35 25,48 5,35 5,15" fill="currentColor" className="text-[#C47978]" />
                  </svg>
                </div>
                <p className="text-white text-sm mb-1 relative z-10">{series.name}</p>
                <p className="text-xs text-gray-400 relative z-10">{series.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Series Detail */}
        <div className="p-6">
          {currentSeries ? (
            <div className="max-w-4xl">
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#8CE2D0]" />
                  </svg>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-white text-2xl mb-3">{currentSeries.name}</h2>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-900/30 text-blue-400 border border-blue-700/50 hover:bg-blue-900/40">
                        {currentSeries.status}
                      </Badge>
                      <Badge className="bg-[#BC6B6B]/20 text-[#BC6B6B] border border-[#BC6B6B]/30 hover:bg-[#BC6B6B]/30">
                        {currentSeries.isComplete ? 'Complete' : 'Not Series (yet)'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="text-gray-400 hover:text-[#BC6B6B] transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a]">
                <h3 className="text-white mb-4">Books in Series</h3>
                
                <div className="bg-[#0a3a4a] border border-[#8CE2D0]/30 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#8CE2D0] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#8CE2D0]">
                    No books in this series yet. Add books and assign them to "{currentSeries.name}" in the Books page.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-400">Select a series to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
