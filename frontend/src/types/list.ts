export enum ListVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

export enum ListRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer',
}

export enum ListItemType {
  BOOK = 'book',
  EXTERNAL = 'external',
}

export enum ListProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface ReadingListSummary {
  id: string;
  title: string;
  description: string | null;
  visibility: ListVisibility;
  owner_id: string;
  item_count: number;
  member_count: number;
  role: ListRole | null;
}

export interface ReadingList {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: ListVisibility;
  created_at: string;
  updated_at: string;
}

export interface ReadingListItem {
  id: string;
  list_id: string;
  order_index: number;
  book_id: string | null;
  title: string;
  author: string | null;
  isbn: string | null;
  notes: string | null;
  cover_image_url: string | null;
  item_type: ListItemType;
  created_at: string;
  updated_at: string;
}

export interface ReadingListItemInput {
  title: string;
  author?: string | null;
  isbn?: string | null;
  notes?: string | null;
  cover_image_url?: string | null;
  book_id?: string | null;
  item_type?: ListItemType;
  order_index?: number | null;
}

export interface ReadingListMember {
  id: string;
  list_id: string;
  user_id: string;
  role: ListRole;
  invited_by: string | null;
  joined_at: string;
}

export interface ReadingListMemberInput {
  user_id: string;
  role?: ListRole;
}

export interface ReadingListProgress {
  id: string;
  list_id: string;
  list_item_id: string;
  user_id: string;
  status: ListProgressStatus;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ReadingListDetail {
  list: ReadingList;
  items: ReadingListItem[];
  members: ReadingListMember[];
  progress: ReadingListProgress[];
}
