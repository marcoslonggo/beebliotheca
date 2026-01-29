export interface Library {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  user_role?: string | null; // Role of current user: 'owner', 'admin', 'member', 'viewer'
}

export interface LibraryCreateRequest {
  name: string;
  description?: string;
}

export interface LibraryUpdateRequest {
  name?: string;
  description?: string;
}

export interface LibraryMember {
  id: string;
  library_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  username: string;
  email: string;
  full_name: string;
}

export interface LibraryMemberCreateRequest {
  user_id: string;
  role?: 'admin' | 'member' | 'viewer';
}

export interface LibraryMemberUpdateRequest {
  role: 'admin' | 'member' | 'viewer';
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface LibraryInvitation {
  id: string;
  library_id: string;
  inviter_id: string;
  invitee_username: string;
  invitee_id: string | null;
  role: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
}

export interface LibraryInvitationWithDetails extends LibraryInvitation {
  library_name: string;
  inviter_username: string;
  inviter_full_name: string;
}

export interface LibraryInvitationCreateRequest {
  invitee_username: string;
  role: 'admin' | 'viewer';
}

export type NotificationType =
  | 'library_invitation'
  | 'loan_request'
  | 'loan_approved'
  | 'loan_denied'
  | 'loan_overdue';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}
