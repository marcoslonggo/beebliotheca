import { Plus, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';

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
    id: '1',
    name: 'Test list',
    description: 'Here is the description',
    itemCount: 0,
    overlook: 1,
    isShared: true
  }
];

export function ReadingLists() {
  const [selectedList, setSelectedList] = useState<string | null>(null);

  return (
    <div className="flex-1 bg-[#0f0f0f] min-h-screen">
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl mb-1">Reading Lists</h1>
          <p className="text-sm text-gray-400">Create, share, and track curated reading lists.</p>
        </div>
        <Button className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      <div className="px-6 py-6 grid grid-cols-[400px_1fr] gap-6">
        {/* Lists Sidebar */}
        <div className="space-y-3">
          {mockLists.map((list) => (
            <div 
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`bg-[#1a1a1a] rounded-lg p-4 border transition-all cursor-pointer relative overflow-hidden ${
                selectedList === list.id 
                  ? 'border-[#8CE2D0] bg-[#1a2a2a]' 
                  : 'border-[#2a2a2a] hover:border-[#8CE2D0]/30'
              }`}
            >
              <div className="absolute top-2 right-2 opacity-5">
                <svg viewBox="0 0 50 50" className="w-12 h-12">
                  <polygon points="25,2 45,15 45,35 25,48 5,35 5,15" fill="currentColor" className="text-[#8CE2D0]" />
                </svg>
              </div>
              
              <h3 className="text-white mb-2 relative z-10">{list.name}</h3>
              <p className="text-sm text-gray-400 mb-3 relative z-10">{list.description}</p>
              
              <div className="flex items-center gap-2 relative z-10">
                <Badge variant="secondary" className="bg-[#2a2a2a] text-gray-300 hover:bg-[#333]">
                  {list.itemCount} items
                </Badge>
                <Badge variant="secondary" className="bg-[#2a2a2a] text-gray-300 hover:bg-[#333]">
                  {list.overlook} overlook
                </Badge>
                {list.isShared && (
                  <Badge className="bg-[#C47978]/20 text-[#C47978] border border-[#C47978]/30 hover:bg-[#C47978]/30">
                    shared
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail View */}
        <div className="flex items-center justify-center">
          <div className="text-center relative">
            {/* Honeycomb pattern */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <svg key={i} viewBox="0 0 100 100" className="w-16 h-16">
                    <polygon 
                      points="50,5 90,30 90,70 50,95 10,70 10,30" 
                      fill="currentColor" 
                      className="text-[#8CE2D0]" 
                    />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1a] border-2 border-[#8CE2D0]/30 flex items-center justify-center">
                <Info className="w-8 h-8 text-[#8CE2D0]" />
              </div>
              <p className="text-[#8CE2D0]">Select a list to view details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
