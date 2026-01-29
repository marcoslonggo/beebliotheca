import client from "./client";

export interface Series {
  id: number;
  name: string;
  library_id: string;
  description: string | null;
  publication_status: "in_progress" | "finished";
  cover_book_id: string | null;
  custom_cover_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeriesReadingStatus {
  series_id: number;
  reading_status: "not_started" | "reading" | "completed";
  total_books: number;
  read_books: number;
}

export interface SeriesBook {
  library_book_id: string;
  book_id: string;
  title: string;
  cover_image_url: string | null;
  cover_image_path: string | null;
  is_series_cover: boolean;
}

export const listSeries = async (libraryId: string): Promise<Series[]> => {
  const response = await client.get<Series[]>(`/libraries/${libraryId}/series`);
  return response.data;
};

export const getSeries = async (libraryId: string, id: number): Promise<Series> => {
  const response = await client.get<Series>(`/libraries/${libraryId}/series/${id}`);
  return response.data;
};

export const getSeriesBooks = async (
  libraryId: string,
  id: number,
): Promise<SeriesBook[]> => {
  const response = await client.get<SeriesBook[]>(
    `/libraries/${libraryId}/series/${id}/books`,
  );
  return response.data;
};

export const createSeries = async (
  libraryId: string,
  data: {
    name: string;
    description?: string | null;
    publication_status?: "in_progress" | "finished";
    cover_book_id?: string | null;
    custom_cover_path?: string | null;
  },
): Promise<Series> => {
  const response = await client.post<Series>(`/libraries/${libraryId}/series`, {
    library_id: libraryId,
    ...data,
  });
  return response.data;
};

export const updateSeries = async (
  libraryId: string,
  id: number,
  data: {
    name?: string;
    description?: string | null;
    publication_status?: "in_progress" | "finished";
    cover_book_id?: string | null;
    custom_cover_path?: string | null;
  },
): Promise<Series> => {
  const response = await client.patch<Series>(
    `/libraries/${libraryId}/series/${id}`,
    data,
  );
  return response.data;
};

export const deleteSeries = async (libraryId: string, id: number): Promise<void> => {
  await client.delete(`/libraries/${libraryId}/series/${id}`);
};

export const getSeriesReadingStatus = async (
  libraryId: string,
  id: number,
): Promise<SeriesReadingStatus> => {
  const response = await client.get<SeriesReadingStatus>(
    `/libraries/${libraryId}/series/${id}/reading-status`,
  );
  return response.data;
};

export const uploadSeriesCover = async (
  libraryId: string,
  id: number,
  file: File,
): Promise<Series> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await client.post<Series>(
    `/libraries/${libraryId}/series/${id}/cover`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};
