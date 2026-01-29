export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AdminLibraryMember {
  user_id: string;
  username: string;
  full_name: string;
  role: MemberRole;
  is_admin: boolean;
}

export interface AdminUserLibrary {
  library_id: string;
  library_name: string;
  role: MemberRole;
  member_count: number;
  members: AdminLibraryMember[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  libraries: AdminUserLibrary[];
}

export interface UpdateAdminStatusRequest {
  is_admin: boolean;
}

export interface UpdatePasswordRequest {
  new_password: string;
}

export interface UpdateLibraryRoleRequest {
  role: MemberRole;
}
