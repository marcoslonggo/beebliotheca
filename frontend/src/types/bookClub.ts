export type BookClubRole = 'owner' | 'moderator' | 'member';

export interface BookClub {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  slug: string | null;
  current_book_id: string | null;
  pages_total_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface BookClubSummary {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  current_book_id: string | null;
  pages_total_override: number | null;
  member_count: number;
  membership_role: BookClubRole | null;
  slug: string | null;
}

export interface BookClubCreateRequest {
  name: string;
  description?: string | null;
  current_book_id?: string | null;
  slug?: string | null;
  pages_total_override?: number | null;
}

export interface BookClubUpdateRequest {
  name?: string;
  description?: string | null;
  current_book_id?: string | null;
  slug?: string | null;
  pages_total_override?: number | null;
}

export interface BookClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: BookClubRole;
  joined_at: string;
  last_active_at: string | null;
  left_at: string | null;
  removed_by: string | null;
}

export interface BookClubMemberInput {
  user_id: string;
  role?: BookClubRole;
}

export interface BookClubMemberUpdateRequest {
  role: BookClubRole;
  left_at?: string | null;
}

export interface BookClubProgress {
  id: string;
  club_id: string;
  user_id: string;
  current_page: number;
  pages_total: number | null;
  updated_at: string;
}

export interface BookClubProgressInput {
  current_page: number;
  pages_total?: number | null;
}

export interface BookClubComment {
  id: string;
  club_id: string;
  user_id: string;
  page_number: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface BookClubCommentInput {
  page_number: number;
  body: string;
}

export interface BookClubBook {
  id: string;
  club_id: string;
  book_id: string;
  started_at: string;
  completed_at: string | null;
}

export interface BookClubDetail {
  club: BookClub;
  members: BookClubMember[];
  progress: BookClubProgress[];
  comments: BookClubComment[];
  history: BookClubBook[];
}
