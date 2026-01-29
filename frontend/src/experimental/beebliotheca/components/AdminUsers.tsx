import { Info, Users } from "lucide-react";

import { useTheme } from "../ThemeContext";

interface Membership {
  library: string;
  members: number;
  role: "Owner" | "Admin";
}

interface User {
  name: string;
  email: string;
  username: string;
  libraries: number;
  joined: string;
  isAdmin: boolean;
  memberships: Membership[];
}

const mockUsers: User[] = [
  {
    name: "Marcos",
    email: "marcosadmin@gmail.com",
    username: "marcosadmin",
    libraries: 3,
    joined: "11/3/2025",
    isAdmin: true,
    memberships: [
      { library: "Classe", members: 2, role: "Owner" },
      { library: "test", members: 2, role: "Owner" },
      { library: "Test michele", members: 2, role: "Admin" }
    ]
  },
  {
    name: "Michele",
    email: "micheletest@gmail.com",
    username: "micheletest21",
    libraries: 2,
    joined: "11/4/2025",
    isAdmin: true,
    memberships: [
      { library: "Test michele", members: 2, role: "Owner" },
      { library: "test", members: 2, role: "Admin" }
    ]
  }
];

export const AdminUsers = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";

  return (
    <div className={`flex-1 min-h-[calc(100vh-4rem)] ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
      <header className="px-6 py-5 border-b border-[#1f1f1f]">
        <p className="text-sm uppercase tracking-[0.3em] text-[#8CE2D0]">Admin</p>
        <h2 className="text-2xl font-semibold text-white">User Management</h2>
        <p className="text-sm text-gray-400">
          Manage user accounts, roles, and library memberships.
        </p>
      </header>

      <div className="px-6 py-6 grid gap-5 md:grid-cols-2">
        {mockUsers.map((user) => (
          <article
            key={user.email}
            className="rounded-3xl border border-[#1f1f1f] bg-[#111111] p-6 shadow-soft-card/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.04] bg-gradient-to-br from-[#BC6B6B] via-transparent to-transparent" />
            <div className="relative space-y-5">
              <header className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <span className="px-3 py-1 rounded-full border border-[#8CE2D0]/30 text-[#8CE2D0] text-xs">
                  Admin
                </span>
              </header>

              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span>@{user.username}</span>
                <span className="text-gray-600">•</span>
                <span>{user.libraries} libraries</span>
                <span className="ml-auto text-xs text-gray-500">Joined {user.joined}</span>
              </div>

              <section className="rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#8CE2D0] text-sm uppercase tracking-wide">
                  <Users className="w-4 h-4" />
                  Memberships
                </div>
                {user.memberships.map((membership) => (
                  <div
                    key={`${user.email}-${membership.library}`}
                    className="flex items-center gap-3 text-sm text-gray-300 border-b border-[#1a1a1a] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{membership.library}</p>
                      <p className="text-xs text-gray-500">{membership.members} members</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs border ${
                        membership.role === "Owner"
                          ? "border-[#8CE2D0]/40 text-[#8CE2D0]"
                          : "border-[#C47978]/40 text-[#C47978]"
                      }`}
                    >
                      {membership.role}
                    </span>
                    <button className="w-9 h-9 rounded-xl border border-[#1f1f1f] text-gray-400 hover:text-white">
                      <Info className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </section>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
