import { Series } from './series';

export interface MetadataCandidateField {
  current: unknown;
  suggested: unknown;
}

export interface ApiBookV2 {
  id: string;
  title: string;
  authors?: string[] | null;
  isbn?: string | null;
  publisher?: string | null;
  description?: string | null;
  publish_date?: string | null;
  subjects?: string[] | null;
  language?: string[] | null;
  page_count?: number | null;
  cover_url?: string | null;
  metadata_status: string;
  metadata_candidate?: Record<string, MetadataCandidateField> | null;
  created_at: string;
  updated_at: string;
}

export interface ApiLibraryBook {
  id: string;
  book_id: string;
  library_id: string;
  ownership_status: string;
  condition?: string | null;
  physical_location?: string | null;
  book_type?: string | null;
  series?: string | null;
  acquisition_date?: string | null;
  library_notes?: string | null;
  loan_status: "available" | "checked_out";
  checked_out_to?: string | null;
  checked_out_at?: string | null;
  due_date?: string | null;
  cover_image_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUserBookData {
  id: string;
  book_id: string;
  library_id: string;
  user_id: string;
  reading_status?: string | null;
  progress_pages?: number | null;
  progress_percent?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  completion_history?: string[] | null;
  grade?: number | null;
  personal_notes?: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiLibraryBookDetail {
  book: ApiBookV2;
  library_book: ApiLibraryBook;
  personal_data?: ApiUserBookData | null;
  series?: Series | null;
}

export interface Book {
  id: string;
  book_id: string;
  library_id: string;
  title: string;
  creator?: string[] | null;
  subject?: string[] | null;
  description?: string | null;
  publisher?: string | null;
  date?: string | null;
  identifier?: string | null;
  language?: string[] | null;
  ownership_status: string;
  condition?: string | null;
  shelf_location?: string | null;
  book_type?: string | null;
  library_notes?: string | null;
  loan_status: "available" | "loaned";
  loan_due_date?: string | null;
  cover_image_url?: string | null;
  cover_image_path?: string | null;
  metadata_status: string;
  metadata_candidate?: Record<string, MetadataCandidateField> | null;
  series?: string | null;  // Legacy string field for backward compatibility
  series_obj?: Series | null;  // New full Series object
  created_at: string;
  updated_at: string;
  reading_status?: string | null;
  progress_pages?: number | null;
  progress_percent?: number | null;
  completion_history?: string[] | null;
  grade?: number | null;
  personal_notes?: string | null;
  is_favorite?: boolean;
}

export interface BookFormValues {
  id?: string;
  title: string;
  creator: string[];
  subject: string[];
  description?: string | null;
  publisher?: string | null;
  date?: string | null;
  identifier?: string | null;
  language: string[];
  ownership_status: string;
  condition?: string | null;
  shelf_location?: string | null;
  book_type?: string | null;
  library_notes?: string | null;
  loan_status: "available" | "loaned";
  loan_due_date?: string | null;
  cover_image_url?: string | null;
  cover_image_path?: string | null;
  metadata_status: string;
  metadata_candidate?: Record<string, MetadataCandidateField> | null;
  series?: string | null;
  reading_status?: string | null;
  grade?: number | null;
  personal_notes?: string | null;
}

export interface MetadataCandidateResponse {
  book_id: string;
  metadata_candidate: Record<string, MetadataCandidateField> | null;
  metadata_status: string;
}

export interface ListBooksResponse {
  items: Book[];
  total: number;
}

