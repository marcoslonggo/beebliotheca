import { Plus, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { useTheme } from './ThemeContext';

export function BookClubs() {
  const { theme } = useTheme();
  
  const clubs = [
    { name: 'Test book club', members: 3 }
  ];

  const currentClub = {
    name: 'Test book club',
    description: 'Here is the description',
    meeting: {
      version: 1,
      page: 'You can track readings',
      totalPages: 'Book mediation'
    },
    members: [
      { name: 'You', lastAdded: 'Never tried Added (Michele, 8/3/27 AM' }
    ],
    discussion: []
  };

  return (
    <div className={`flex-1 min-h-screen ${
      theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'
    }`}>
      <div className={`px-6 py-4 border-b ${
        theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Book Clubs</h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Track group reads, discussion progress, and discussions by date.</p>
          </div>
          <Button className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
            <Plus className="w-4 h-4 mr-2" />
            New Book Club
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 grid grid-cols-[350px_1fr] gap-6">
        {/* Your Clubs */}
        <div className="space-y-4">
          <h2 className={`mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Your Clubs</h2>
          <p className={`text-sm mb-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            See live a little to manage progress and discussions
          </p>
          
          {clubs.map((club, idx) => (
            <div key={idx} className={`rounded-lg p-4 border transition-colors cursor-pointer relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#8CE2D0]/30'
                : 'bg-white border-gray-200 hover:border-[#8CE2D0]/50'
            }`}>
              <div className="absolute top-2 right-2 opacity-5">
                <svg viewBox="0 0 50 50" className="w-12 h-12">
                  <polygon points="25,2 45,15 45,35 25,48 5,35 5,15" fill="currentColor" className="text-[#8CE2D0]" />
                </svg>
              </div>
              <h3 className={`mb-1 relative z-10 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>{club.name}</h3>
              <p className={`text-sm relative z-10 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>{club.members} members</p>
            </div>
          ))}
        </div>

        {/* Club Details */}
        <div className="space-y-6">
          <div className={`rounded-lg p-6 border ${
            theme === 'dark'
              ? 'bg-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{currentClub.name}</h2>
            <p className={`text-sm mb-6 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>{currentClub.description}</p>

            {/* Update Progress */}
            <div className={`rounded-lg p-6 border mb-6 ${
              theme === 'dark'
                ? 'bg-[#0f0f0f] border-[#2a2a2a]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Update Progress</h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-sm mb-2 block ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Current page</label>
                  <Input 
                    type="number" 
                    className={theme === 'dark'
                      ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                      : 'bg-white border-gray-200 text-gray-900'}
                  />
                </div>

                <div>
                  <label className={`text-sm mb-2 block ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Overwrite total pages</label>
                  <Input 
                    type="number" 
                    className={theme === 'dark'
                      ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                      : 'bg-white border-gray-200 text-gray-900'}
                  />
                </div>

                <div>
                  <label className={`text-sm mb-2 block ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>Completion is easy completed</label>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>

                <Button className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
                  Save Progress
                </Button>
              </div>
            </div>

            {/* Member Progress */}
            <div className={`rounded-lg p-6 border mb-6 ${
              theme === 'dark'
                ? 'bg-[#0f0f0f] border-[#2a2a2a]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Member Progress</h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>No progress updates yet. Keep reading!</p>
            </div>

            {/* Members */}
            <div className={`rounded-lg p-6 border mb-6 relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f0f0f] border-[#2a2a2a]'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#C47978]" />
                </svg>
              </div>
              <h3 className="text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </h3>
              <div className="space-y-3">
                {currentClub.members.map((member, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="text-white">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.lastAdded}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Discussion */}
            <div className="bg-[#0f0f0f] rounded-lg p-6 border border-[#2a2a2a]">
              <h3 className="text-white mb-2">Discussion</h3>
              <p className="text-sm text-gray-400 mb-4">Comments visible via you attendees</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Comment page</label>
                  <Input 
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Share your thoughts</label>
                  <Textarea 
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white min-h-[100px]"
                    placeholder=""
                  />
                </div>

                <Button className="w-full bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
                  Post Comment
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                <p className="text-sm text-gray-400">No comments submitted yet. Keep reading!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
