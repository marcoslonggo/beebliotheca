import client from "./client";

interface SearchResult {
  title: string;
  authors?: string[];
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverUrl?: string;
  pageCount?: number;
}

export const searchBooks = async (
  libraryId: string,
  query: string,
  searchType: string = "auto",
  maxResults: number = 5
): Promise<SearchResult[]> => {
  const response = await client.get<SearchResult[]>(
    `/libraries/${libraryId}/enrichment/search`,
    {
      params: {
        query,
        search_type: searchType,
        max_results: maxResults,
      },
    }
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
