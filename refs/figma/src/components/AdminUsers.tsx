import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, Info } from 'lucide-react';

interface User {
  name: string;
  email: string;
  username: string;
  libraries: number;
  joined: string;
  isAdmin: boolean;
  memberships: {
    library: string;
    members: number;
    role: 'Owner' | 'Admin';
  }[];
}

const mockUsers: User[] = [
  {
    name: 'Marcos',
    email: 'marcosadmin@gmail.com',
    username: 'marcosadmin',
    libraries: 3,
    joined: '11/3/2025',
    isAdmin: true,
    memberships: [
      { library: 'Classe', members: 2, role: 'Owner' },
      { library: 'test', members: 2, role: 'Owner' },
      { library: 'Test michele', members: 2, role: 'Admin' }
    ]
  },
  {
    name: 'Michele',
    email: 'micheletest@gmail.com',
    username: 'micheletest21',
    libraries: 2,
    joined: '11/4/2025',
    isAdmin: true,
    memberships: [
      { library: 'Test michele', members: 2, role: 'Owner' },
      { library: 'test', members: 2, role: 'Admin' }
    ]
  },
  {
    name: 'Test User',
    email: 'test@example.com',
    username: 'test',
    libraries: 1,
    joined: '11/3/2025',
    isAdmin: true,
    memberships: [
      { library: 'Test Library', members: 1, role: 'Owner' }
    ]
  },
  {
    name: 'test2',
    email: 'test@test.com',
    username: 'test2',
    libraries: 1,
    joined: '11/5/2025',
    isAdmin: true,
    memberships: [
      { library: 'Test Library', members: 1, role: 'Owner' }
    ]
  }
];

export function AdminUsers() {
  return (
    <div className="flex-1 bg-[#0f0f0f] min-h-screen">
      <div className="border-b border-[#2a2a2a] px-6 py-4">
        <h1 className="text-white text-2xl mb-1">Admin - User Management</h1>
        <p className="text-sm text-[#8CE2D0]">Manage user accounts, roles, and library memberships.</p>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-6">
          {mockUsers.map((user, idx) => (
            <div 
              key={idx} 
              className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#8CE2D0]/30 transition-colors relative overflow-hidden"
            >
              {/* Honeycomb decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#BC6B6B]" />
                </svg>
              </div>

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                  <h3 className="text-white mb-1">{user.name}</h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Admin</span>
                  <Switch checked={user.isAdmin} />
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Username:</span>
                  <span className="text-sm text-white">{user.username}</span>
                  <Badge className="bg-[#8CE2D0]/20 text-[#8CE2D0] border border-[#8CE2D0]/30 hover:bg-[#8CE2D0]/30">
                    Libraries: {user.libraries}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-400">Joined:</span>
                  <span className="text-sm text-white">{user.joined}</span>
                </div>
              </div>

              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#2a2a2a]">
                <h4 className="text-white text-sm mb-3">Library Memberships</h4>
                
                <div className="space-y-3">
                  {user.memberships.map((membership, mIdx) => (
                    <div key={mIdx} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center pb-3 border-b border-[#2a2a2a] last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm text-white mb-1">{membership.library}</p>
                        <p className="text-xs text-gray-400">{membership.members} members</p>
                      </div>
                      
                      <Select defaultValue={membership.role.toLowerCase()}>
                        <SelectTrigger className="w-32 bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                          <SelectItem value="owner" className="text-white">Owner</SelectItem>
                          <SelectItem value="admin" className="text-white">Admin</SelectItem>
                          <SelectItem value="member" className="text-white">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <button className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center hover:bg-[#333] transition-colors">
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#BC6B6B] hover:text-[#BC6B6B] hover:bg-[#BC6B6B]/10"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                <Button 
                  size="sm"
                  className="text-[#8CE2D0] hover:bg-[#8CE2D0]/10 bg-[rgba(196,121,120,0.9)]"
                >
                  Set Password
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
