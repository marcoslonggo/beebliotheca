export interface Series {
  id: number;
  name: string;
  library_id: string;
  description?: string | null;
  publication_status: "in_progress" | "finished";
  cover_book_id?: string | null;
  custom_cover_path?: string | null;
  created_at: string;
  updated_at: string;
}
