import { Plus, Users, Share2, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Library {
  id: string;
  name: string;
  role: 'Owner' | 'Member' | 'Admin';
  memberCount: number;
  created: string;
}

const mockLibraries: Library[] = [
  {
    id: '1',
    name: 'Test michele',
    role: 'Owner',
    memberCount: 2,
    created: '11/1/2025'
  },
  {
    id: '2',
    name: 'test',
    role: 'Member',
    memberCount: 2,
    created: '11/3/2025'
  }
];

export function Libraries() {
  return (
    <div className="flex-1 bg-[#0f0f0f] min-h-screen">
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl mb-1">Libraries</h1>
          <p className="text-sm text-gray-400">Manage your book libraries and collections</p>
        </div>
        <Button className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
          <Plus className="w-4 h-4 mr-2" />
          Create Library
        </Button>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-6">
          {mockLibraries.map((library, idx) => (
            <div 
              key={library.id}
              className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#8CE2D0]/30 transition-all cursor-pointer relative overflow-hidden group"
            >
              {/* Honeycomb decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon 
                    points="50,5 90,30 90,70 50,95 10,70 10,30" 
                    fill="currentColor" 
                    className={idx === 0 ? 'text-[#8CE2D0]' : 'text-[#C47978]'} 
                  />
                </svg>
              </div>

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  {library.role === 'Owner' ? (
                    <Badge className="bg-[#8CE2D0]/20 text-[#8CE2D0] border border-[#8CE2D0]/40 hover:bg-[#8CE2D0]/30">
                      Owner
                    </Badge>
                  ) : (
                    <Badge className="bg-[#C47978]/20 text-[#C47978] border border-[#C47978]/40 hover:bg-[#C47978]/30">
                      {library.role}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-gray-400 hover:text-[#8CE2D0] transition-colors">
                    <Users className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-[#8CE2D0] transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-white text-xl mb-4 relative z-10">{library.name}</h3>

              <div className="flex items-center gap-4 relative z-10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{library.memberCount} Members</span>
                </div>
                <div className="text-sm text-gray-400">
                  Created {library.created}
                </div>
              </div>

              {/* Hover effect border */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8CE2D0] via-[#C47978] to-[#BC6B6B] opacity-0 group-hover:opacity-30 transition-opacity"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
