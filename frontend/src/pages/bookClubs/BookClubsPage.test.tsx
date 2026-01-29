import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import BookClubsPage from './BookClubsPage';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      username: 'reader',
      email: 'reader@example.com',
      full_name: 'Reader One',
      is_admin: false,
      created_at: '',
      updated_at: '',
    },
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    isAdmin: false,
  }),
}));

const listBookClubsMock = vi.fn();
const getBookClubMock = vi.fn();
const createBookClubMock = vi.fn();
const updateProgressMock = vi.fn();
const createCommentMock = vi.fn();

vi.mock('../../api/bookClubs', () => ({
  listBookClubs: (...args: unknown[]) => listBookClubsMock(...args),
  getBookClub: (...args: unknown[]) => getBookClubMock(...args),
  createBookClub: (...args: unknown[]) => createBookClubMock(...args),
  updateProgress: (...args: unknown[]) => updateProgressMock(...args),
  createComment: (...args: unknown[]) => createCommentMock(...args),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('BookClubsPage', () => {
  beforeEach(() => {
    listBookClubsMock.mockResolvedValue([
      {
        id: 'club-1',
        name: 'SFF Readers',
        description: 'Discuss all the nebula winners.',
        owner_id: 'user-1',
        current_book_id: null,
        pages_total_override: 320,
        member_count: 5,
        membership_role: 'owner',
        slug: null,
      },
    ]);

    getBookClubMock.mockResolvedValue({
      club: {
        id: 'club-1',
        name: 'SFF Readers',
        description: 'Discuss all the nebula winners.',
        owner_id: 'user-1',
        current_book_id: null,
        pages_total_override: 320,
        slug: null,
        created_at: '',
        updated_at: '',
      },
      members: [
        {
          id: 'member-1',
          club_id: 'club-1',
          user_id: 'user-1',
          role: 'owner',
          joined_at: '',
          last_active_at: '',
          left_at: null,
          removed_by: null,
        },
      ],
      progress: [
        {
          id: 'progress-1',
          club_id: 'club-1',
          user_id: 'user-1',
          current_page: 42,
          pages_total: 320,
          updated_at: '',
        },
      ],
      comments: [
        {
          id: 'comment-1',
          club_id: 'club-1',
          user_id: 'user-1',
          page_number: 30,
          body: 'That reveal hit hard.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      history: [],
    });
  });

  it('renders club list and detail', async () => {
    render(<BookClubsPage />);

    expect(await screen.findByText('Book Clubs')).toBeInTheDocument();
    expect(await screen.findByText('SFF Readers')).toBeInTheDocument();
    expect(await screen.findByText('Discuss all the nebula winners.')).toBeInTheDocument();
    expect(await screen.findByText(/Page 42/)).toBeInTheDocument();
    expect(await screen.findByText(/That reveal hit hard/)).toBeInTheDocument();
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
