import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import client from './client';
import {
  listBooks,
  createBook,
  updateBook,
  deleteBook,
  enrichBook,
  uploadBookCover,
} from './books';
import type { BookFormValues } from '../types/book';

const mockClient = vi.mocked(client);

const sampleDetail = {
  book: {
    id: 'book-uuid',
    title: 'Sample Book',
    authors: ['Author One'],
    isbn: '1234567890',
    publisher: 'Sample Publisher',
    description: 'Description',
    publish_date: '2024-01-01',
    subjects: ['Fiction'],
    language: ['en'],
    page_count: 200,
    cover_url: 'https://example.com/cover.jpg',
    metadata_status: 'pending',
    metadata_candidate: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  library_book: {
    id: 'library-book-uuid',
    book_id: 'book-uuid',
    library_id: 'library-uuid',
    condition: 'Good',
    physical_location: 'Shelf A',
    series: 'Sample Series',
    acquisition_date: null,
    loan_status: 'available' as const,
    checked_out_to: null,
    checked_out_at: null,
    due_date: null,
    cover_image_path: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  personal_data: null,
};

describe('books api', () => {
  const libraryId = 'library-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists books scoped to a library', async () => {
    mockClient.get.mockResolvedValue({ data: { items: [sampleDetail], total: 1 } });

    const result = await listBooks(libraryId);

    expect(mockClient.get).toHaveBeenCalledWith(`/libraries/${libraryId}/books`, { params: {} });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('library-book-uuid');
  });

  it('creates a library book with intrinsic metadata', async () => {
    mockClient.post.mockResolvedValue({ data: sampleDetail });

    const payload: BookFormValues = {
      id: undefined,
      title: 'Sample Book',
      creator: ['Author One'],
      subject: ['Fiction'],
      description: 'Description',
      publisher: 'Sample Publisher',
      contributor: [],
      date: '2024-01-01',
      type: '',
      format: '',
      identifier: '1234567890',
      source: '',
      language: ['en'],
      relation: [],
      coverage: '',
      rights: '',
      auxiliary_fields: {},
      condition: 'Good',
      shelf_location: 'Shelf A',
      loan_status: 'available',
      loan_due_date: '',
      cover_image_url: 'https://example.com/cover.jpg',
      cover_image_path: null,
      metadata_status: 'pending',
      metadata_candidate: null,
      series: 'Sample Series',
    };

    const result = await createBook(libraryId, payload);

    expect(mockClient.post).toHaveBeenCalledWith(
      `/libraries/${libraryId}/books`,
      expect.objectContaining({ book: expect.any(Object), library_book: expect.any(Object) }),
    );
    expect(result.title).toBe('Sample Book');
  });

  it('updates a library book', async () => {
    mockClient.patch.mockResolvedValue({ data: sampleDetail });

    const values: BookFormValues = {
      ...sampleDetail.book,
      creator: sampleDetail.book.authors ?? [],
      subject: sampleDetail.book.subjects ?? [],
      description: sampleDetail.book.description ?? '',
      publisher: sampleDetail.book.publisher ?? '',
      contributor: [],
      date: sampleDetail.book.publish_date ?? '',
      type: '',
      format: '',
      identifier: sampleDetail.book.isbn ?? '',
      source: '',
      language: sampleDetail.book.language ?? [],
      relation: [],
      coverage: '',
      rights: '',
      auxiliary_fields: {},
      condition: sampleDetail.library_book.condition ?? '',
      shelf_location: sampleDetail.library_book.physical_location ?? '',
      loan_status: 'available',
      loan_due_date: '',
      cover_image_url: sampleDetail.book.cover_url ?? '',
      cover_image_path: sampleDetail.library_book.cover_image_path ?? null,
      metadata_status: sampleDetail.book.metadata_status,
      metadata_candidate: sampleDetail.book.metadata_candidate,
      series: sampleDetail.library_book.series ?? '',
    };

    const result = await updateBook(libraryId, 'library-book-uuid', values);

    expect(mockClient.patch).toHaveBeenCalledWith(
      `/libraries/${libraryId}/books/library-book-uuid`,
      expect.any(Object),
    );
    expect(result.id).toBe('library-book-uuid');
  });

  it('deletes a library book', async () => {
    await deleteBook(libraryId, 'library-book-uuid');

    expect(mockClient.delete).toHaveBeenCalledWith(`/libraries/${libraryId}/books/library-book-uuid`);
  });

  it('enriches a library book', async () => {
    mockClient.post.mockResolvedValue({ data: sampleDetail });

    const result = await enrichBook(libraryId, 'library-book-uuid');

    expect(mockClient.post).toHaveBeenCalledWith(`/libraries/${libraryId}/enrichment/books/library-book-uuid`);
    expect(result.metadata_status).toBe('pending');
  });

  it('uploads a cover image for a library book', async () => {
    const file = new File(['data'], 'cover.jpg', { type: 'image/jpeg' });
    mockClient.post.mockResolvedValue({ data: sampleDetail });

    await uploadBookCover(libraryId, 'library-book-uuid', file);

    expect(mockClient.post).toHaveBeenCalledWith(
      `/libraries/${libraryId}/books/library-book-uuid/cover`,
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
  });
});
