import client from "./client";
import { listSeries } from "./series";
import {
  ApiLibraryBookDetail,
  Book,
  BookFormValues,
  ListBooksResponse,
  MetadataCandidateResponse,
} from "../types/book";

export interface ListBooksParams {
  q?: string;
  skip?: number;
  limit?: number;
  metadata_status?: string;
}

interface ApiListBooksResponse {
  items: ApiLibraryBookDetail[];
  total: number;
}

interface LibraryBookCreatePayload {
  book_id?: string;
  book?: Record<string, unknown>;
  library_book?: Record<string, unknown>;
  personal_data?: Record<string, unknown> | null;
}

interface LibraryBookUpdatePayload extends LibraryBookCreatePayload {}

const loanStatusToUi = (status: "available" | "checked_out"): "available" | "loaned" =>
  status === "checked_out" ? "loaned" : "available";

const loanStatusToApi = (status: "available" | "loaned"): "available" | "checked_out" =>
  status === "loaned" ? "checked_out" : "available";

const toBook = ({ book, library_book, personal_data, series }: ApiLibraryBookDetail): Book => {
  // Debug: Log the series data
  if (library_book.series) {
    console.log('toBook - series name:', library_book.series, 'series obj:', series);
  }

  return {
    id: library_book.id,
    book_id: book.id,
    library_id: library_book.library_id,
    title: book.title,
    creator: book.authors ?? [],
    subject: book.subjects ?? [],
    description: book.description ?? null,
    publisher: book.publisher ?? null,
    date: book.publish_date ?? null,
    identifier: book.isbn ?? null,
    language: book.language ?? [],
    ownership_status: library_book.ownership_status,
    condition: library_book.condition ?? null,
    shelf_location: library_book.physical_location ?? null,
    book_type: library_book.book_type ?? null,
    library_notes: library_book.library_notes ?? null,
    loan_status: loanStatusToUi(library_book.loan_status),
    loan_due_date: library_book.due_date ?? null,
    cover_image_url: book.cover_url ?? null,
    cover_image_path: library_book.cover_image_path ?? null,
    metadata_status: book.metadata_status,
    metadata_candidate: book.metadata_candidate ?? null,
    series: library_book.series ?? null,
    series_obj: series ?? null,
    created_at: library_book.created_at,
    updated_at: library_book.updated_at,
    reading_status: personal_data?.reading_status ?? null,
    progress_pages: personal_data?.progress_pages ?? null,
    progress_percent: personal_data?.progress_percent ?? null,
    completion_history: personal_data?.completion_history ?? null,
    grade: personal_data?.grade ?? null,
    personal_notes: personal_data?.personal_notes ?? null,
    is_favorite: personal_data?.is_favorite ?? false,
  };
};

const toIsoDate = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.includes("T")) {
    return value;
  }
  return new Date(`${value}T00:00:00`).toISOString();
};

const buildBookData = (values: BookFormValues) => {
  const data: Record<string, any> = {
    title: values.title,
    metadata_status: values.metadata_status,
  };

  if (values.creator?.length) data.authors = values.creator;
  if (values.identifier !== undefined && values.identifier !== null) data.isbn = values.identifier;
  if (values.publisher !== undefined && values.publisher !== null) data.publisher = values.publisher;
  if (values.description !== undefined && values.description !== null) data.description = values.description;
  if (values.date !== undefined && values.date !== null) data.publish_date = values.date;
  if (values.subject?.length) data.subjects = values.subject;
  if (values.language?.length) data.language = values.language;
  if (values.cover_image_url !== undefined && values.cover_image_url !== null) data.cover_url = values.cover_image_url;

  return data;
};

const buildLibraryBookData = (values: BookFormValues) => {
  const data: Record<string, any> = {
    ownership_status: values.ownership_status,
    loan_status: loanStatusToApi(values.loan_status),
  };

  if (values.condition !== undefined && values.condition !== null) data.condition = values.condition;
  if (values.shelf_location !== undefined && values.shelf_location !== null) data.physical_location = values.shelf_location;
  if (values.book_type !== undefined && values.book_type !== null) data.book_type = values.book_type;
  if (values.library_notes !== undefined && values.library_notes !== null) data.library_notes = values.library_notes;
  if (values.series !== undefined && values.series !== null) data.series = values.series;
  if (values.loan_due_date !== undefined && values.loan_due_date !== null) data.due_date = toIsoDate(values.loan_due_date);

  return data;
};

const buildPersonalData = (values: BookFormValues) => {
  const data: Record<string, any> = {};

  if (values.reading_status !== undefined && values.reading_status !== null) data.reading_status = values.reading_status;
  if (values.grade !== undefined && values.grade !== null) data.grade = values.grade;
  if (values.personal_notes !== undefined && values.personal_notes !== null) data.personal_notes = values.personal_notes;

  return data;
};

const toCreatePayload = (values: BookFormValues): LibraryBookCreatePayload => ({
  book: buildBookData(values),
  library_book: buildLibraryBookData(values),
  personal_data: buildPersonalData(values),
});

const toUpdatePayload = (values: BookFormValues): LibraryBookUpdatePayload => ({
  book: buildBookData(values),
  library_book: buildLibraryBookData(values),
  personal_data: buildPersonalData(values),
});

export const listBooks = async (
  libraryId: string,
  params: ListBooksParams = {},
): Promise<ListBooksResponse> => {
  const response = await client.get<ApiListBooksResponse>(
    `/libraries/${libraryId}/books`,
    { params },
  );

  let items = response.data.items ?? [];

  // Debug: Log first item to see raw API response
  if (items.length > 0) {
    console.log('Raw API response (first item):', JSON.stringify(items[0], null, 2));
  }

  // Some backend environments omit the `series` object. If so, fetch it separately.
  const needsSeriesHydration = items.some((item) => item.series === undefined);
  if (needsSeriesHydration) {
    try {
      const seriesList = await listSeries(libraryId);
      const seriesLookup = new Map(seriesList.map((series) => [series.name, series]));

      items = items.map((item) => {
        if (item.series !== undefined) return item;
        const seriesName = item.library_book?.series?.trim();
        return {
          ...item,
          series: seriesName ? seriesLookup.get(seriesName) ?? null : null,
        };
      });
    } catch (error) {
      console.warn("Failed to hydrate series metadata, continuing without it.", error);
    }
  }

  return {
    items: items.map(toBook),
    total: response.data.total,
  };
};

export const createBook = async (
  libraryId: string,
  values: BookFormValues,
): Promise<Book> => {
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/books`,
    toCreatePayload(values),
  );
  return toBook(response.data);
};

export const updateBook = async (
  libraryId: string,
  libraryBookId: string,
  values: BookFormValues,
): Promise<Book> => {
  const response = await client.patch<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/books/${libraryBookId}`,
    toUpdatePayload(values),
  );
  return toBook(response.data);
};

export const deleteBook = async (libraryId: string, libraryBookId: string): Promise<void> => {
  await client.delete(`/libraries/${libraryId}/books/${libraryBookId}`);
};

export const enrichBook = async (libraryId: string, libraryBookId: string): Promise<Book> => {
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/enrichment/books/${libraryBookId}`,
  );
  return toBook(response.data);
};

export const getMetadataCandidate = async (
  libraryId: string,
  libraryBookId: string,
): Promise<MetadataCandidateResponse> => {
  const response = await client.get<MetadataCandidateResponse>(
    `/libraries/${libraryId}/enrichment/books/${libraryBookId}/candidate`,
  );
  return response.data;
};

export const getMetadataPreview = async (
  libraryId: string,
  identifier: string,
): Promise<Record<string, unknown>> => {
  const response = await client.get<Record<string, unknown>>(
    `/libraries/${libraryId}/enrichment/preview/${identifier}`,
  );
  return response.data;
};

export const applyMetadataCandidate = async (
  libraryId: string,
  libraryBookId: string,
  fields?: string[],
): Promise<Book> => {
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/enrichment/books/${libraryBookId}/candidate/apply`,
    { fields: fields ?? [] },
  );
  return toBook(response.data);
};

export const rejectMetadataCandidate = async (
  libraryId: string,
  libraryBookId: string,
): Promise<Book> => {
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/enrichment/books/${libraryBookId}/candidate/reject`,
  );
  return toBook(response.data);
};

export const uploadBookCover = async (
  libraryId: string,
  libraryBookId: string,
  file: File,
): Promise<Book> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/books/${libraryBookId}/cover`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return toBook(response.data);
};

export const searchBooks = async (
  libraryId: string,
  query: string,
  searchType: "title" | "isbn" | "auto" = "auto",
  maxResults?: number,
): Promise<Record<string, unknown>[]> => {
  const response = await client.get<Record<string, unknown>[]>(
    `/libraries/${libraryId}/enrichment/search`,
    { params: { query, search_type: searchType, max_results: maxResults } },
  );
  return response.data;
};

export const seedSampleBooks = async (libraryId: string): Promise<Book[]> => {
  const response = await client.post<ApiLibraryBookDetail[]>(
    `/libraries/${libraryId}/books/seed`,
  );
  return response.data.map(toBook);
};

export const listBooksRaw = async (
  libraryId: string,
  params: ListBooksParams = {},
): Promise<ApiLibraryBookDetail[]> => {
  const response = await client.get<ApiListBooksResponse>(
    `/libraries/${libraryId}/books`,
    { params },
  );
  return response.data.items;
};

export const finishReading = async (
  libraryId: string,
  libraryBookId: string,
  completionDate: string,
): Promise<Book> => {
  const response = await client.post<ApiLibraryBookDetail>(
    `/libraries/${libraryId}/books/${libraryBookId}/finish`,
    { completion_date: completionDate },
  );
  return toBook(response.data);
};
