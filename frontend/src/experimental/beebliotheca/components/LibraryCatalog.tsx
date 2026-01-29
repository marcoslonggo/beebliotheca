import {
  ArrowUpDown,
  BookmarkCheck,
  ChevronDown,
  Edit,
  Grid3x3,
  Info,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";

import { useTheme } from "../ThemeContext";

type BookStatus = "To read" | "Reading" | "Up next" | "Read" | "Reread" | "Abandoned";

interface Book {
  id: string;
  title: string;
  author: string;
  loan: "Available" | "Loaned";
  subjects: string[];
  metadata: "complete" | "incomplete";
  status: BookStatus;
  condition: "To check" | "Wanted" | "Owned";
  coverImage?: string;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  description?: string;
  language?: string;
  added?: string;
  updated?: string;
  pages?: number;
}

const mockBooks: Book[] = [
  {
    id: "1",
    title: "The Body Keeps the Score",
    author: "Bessel A. van der Kolk",
    loan: "Available",
    subjects: ["Medicine"],
    metadata: "complete",
    status: "Read",
    condition: "Owned",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
    isbn: "9780143127741",
    publisher: "Penguin Books",
    publicationDate: "2015-09-08",
    description: "Originally published by Viking Penguin, 2014.",
    language: "en",
    added: "11/4/2025",
    updated: "11/7/2025",
    pages: 464
  },
  {
    id: "2",
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    loan: "Available",
    subjects: ["Fiction"],
    metadata: "complete",
    status: "Reading",
    condition: "Owned",
    coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
    isbn: "9780735219090",
    publisher: "G.P. Putnam's Sons",
    publicationDate: "2018-08-14",
    description: "A coming-of-age story set in the marshlands of North Carolina.",
    language: "en",
    added: "10/15/2025",
    updated: "11/6/2025",
    pages: 384
  },
  {
    id: "3",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    loan: "Available",
    subjects: ["Science", "History"],
    metadata: "complete",
    status: "To read",
    condition: "Wanted",
    coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400",
    isbn: "9780062316097",
    publisher: "Harper",
    publicationDate: "2015-02-10",
    description: "A brief history of humankind from the Stone Age to the modern age.",
    language: "en",
    added: "11/1/2025",
    updated: "11/1/2025",
    pages: 512
  },
  {
    id: "4",
    title: "Educated",
    author: "Tara Westover",
    loan: "Available",
    subjects: ["Biography", "Memoir"],
    metadata: "complete",
    status: "Up next",
    condition: "Owned",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
    isbn: "9780399590504",
    publisher: "Random House",
    publicationDate: "2018-02-20",
    description: "A memoir about a young woman who leaves her survivalist family.",
    language: "en",
    added: "10/20/2025",
    updated: "11/5/2025",
    pages: 352
  },
  {
    id: "5",
    title: "Atomic Habits",
    author: "James Clear",
    loan: "Loaned",
    subjects: ["Self-help", "Psychology"],
    metadata: "complete",
    status: "Reread",
    condition: "Owned",
    coverImage: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400",
    isbn: "9780735211292",
    publisher: "Avery",
    publicationDate: "2018-10-16",
    description: "An easy and proven way to build good habits and break bad ones.",
    language: "en",
    added: "9/5/2025",
    updated: "10/28/2025",
    pages: 320
  },
  {
    id: "6",
    title: "The Midnight Library",
    author: "Matt Haig",
    loan: "Available",
    subjects: ["Fiction", "Fantasy"],
    metadata: "incomplete",
    status: "Abandoned",
    condition: "To check",
    coverImage: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400",
    isbn: "9780525559474",
    publisher: "Viking",
    publicationDate: "2020-09-29",
    description: "A novel about all the choices that go into a life well lived.",
    language: "en",
    added: "10/10/2025",
    updated: "11/3/2025",
    pages: 288
  }
];

const statusColors: Record<BookStatus, string> = {
  "To read": "text-blue-300 bg-blue-500/10 border-blue-500/30",
  Reading: "text-[#8CE2D0] bg-[#8CE2D0]/10 border-[#8CE2D0]/30",
  "Up next": "text-amber-300 bg-amber-500/10 border-amber-500/30",
  Read: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Reread: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  Abandoned: "text-rose-300 bg-rose-500/10 border-rose-500/30"
};

const badgeBase =
  "px-2 py-1 border rounded-full text-xs font-semibold tracking-wide uppercase";

export const LibraryCatalog = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return mockBooks;
    const term = searchTerm.toLowerCase();
    return mockBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div
      className={`flex-1 min-h-[calc(100vh-4rem)] ${
        darkMode ? "bg-[#0f0f0f] text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <header
        className={`px-6 py-5 border-b ${
          darkMode ? "border-[#1f1f1f]" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-[#8CE2D0]">Catalog</p>
            <h2 className="text-2xl font-semibold">Your Books</h2>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2a2a2a] text-sm hover:bg-[#1b1b1b]">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8CE2D0] text-black text-sm font-semibold shadow-soft-card">
              <Plus className="w-4 h-4" />
              Add Book
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total books" value="642" trend="+18 this month" />
          <StatCard label="Loaned" value="42" trend="6 due this week" accent="text-amber-300" />
          <StatCard label="Metadata quality" value="92%" trend="high fidelity" accent="text-emerald-300" />
        </div>
      </header>

      <section className="px-6 py-6 space-y-4">
        <div
          className={`flex flex-wrap gap-3 p-4 rounded-2xl border ${
            darkMode ? "bg-[#111111] border-[#1f1f1f]" : "bg-white border-gray-200"
          } shadow-soft-card/10`}
        >
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className={`w-full pl-10 pr-4 py-2 rounded-xl border bg-transparent ${
                darkMode ? "border-[#2a2a2a] text-white" : "border-gray-200 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-[#8CE2D0]/50`}
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </button>
          <button className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm flex items-center gap-2">
            <ChevronDown className="w-4 h-4" />
            Group
          </button>
          <div className="flex items-center gap-1 border rounded-xl border-[#2a2a2a] p-1">
            <button
              className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                view === "grid" ? "bg-[#1f1f1f] text-white" : "text-gray-400"
              }`}
              onClick={() => setView("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
              Grid
            </button>
            <button
              className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                view === "table" ? "bg-[#1f1f1f] text-white" : "text-gray-400"
              }`}
              onClick={() => setView("table")}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredBooks.map((book) => (
              <article
                key={book.id}
                className={`rounded-3xl border relative overflow-hidden ${
                  darkMode ? "bg-[#111111] border-[#1f1f1f]" : "bg-white border-gray-200"
                } shadow-soft-card/20`}
              >
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-gradient-to-br from-[#8CE2D0] via-transparent to-transparent" />
                <div className="relative p-5 flex gap-5">
                  <img
                    src={book.coverImage}
                    className="w-20 h-28 rounded-xl object-cover"
                    alt={book.title}
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#8CE2D0]">
                          {book.subjects.join(", ")}
                        </p>
                        <h3 className="text-lg font-semibold leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-400">{book.author}</p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={() => setSelectedBook(book)}
                        aria-label="View details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`${badgeBase} text-emerald-300 border-emerald-500/40`}>
                        {book.loan}
                      </span>
                      <span className={`${badgeBase} ${statusColors[book.status]}`}>
                        {book.status}
                      </span>
                      <span className={`${badgeBase} text-gray-300 border-gray-600`}>
                        {book.condition}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-2 text-sm text-gray-400">
                      <span>
                        ISBN <strong className="text-white">{book.isbn}</strong>
                      </span>
                      <span className="hidden lg:inline">•</span>
                      <span className="hidden lg:inline">
                        Added <strong className="text-white">{book.added}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4 flex items-center justify-between text-sm">
                  <div className="flex gap-2 text-gray-400">
                    <button className="px-3 py-1.5 border border-[#2a2a2a] rounded-lg hover:text-white">
                      <BookmarkCheck className="w-4 h-4" />
                    </button>
                    <button className="px-3 py-1.5 border border-[#2a2a2a] rounded-lg hover:text-white">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="px-3 py-1.5 border border-[#2a2a2a] rounded-lg hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">Updated {book.updated}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1f1f1f] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111] text-gray-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Loan</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="border-t border-[#1f1f1f] hover:bg-[#151515] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{book.title}</p>
                      <p className="text-xs text-gray-500">{book.author}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${badgeBase} ${statusColors[book.status]}`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{book.loan}</td>
                    <td className="px-4 py-3">{book.condition}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 text-gray-400">
                        <button onClick={() => setSelectedBook(book)}>
                          <Info className="w-4 h-4" />
                        </button>
                        <button>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBook ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-3xl max-w-3xl w-full p-8 relative">
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <div className="grid md:grid-cols-[180px_1fr] gap-6">
              <img
                src={selectedBook.coverImage}
                alt={selectedBook.title}
                className="w-full h-64 object-cover rounded-2xl"
              />
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#8CE2D0]">
                    {selectedBook.subjects.join(", ")}
                  </p>
                  <h3 className="text-2xl font-semibold">{selectedBook.title}</h3>
                  <p className="text-gray-400">{selectedBook.author}</p>
                </div>
                <p className="text-sm text-gray-300">{selectedBook.description}</p>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Publisher</dt>
                    <dd>{selectedBook.publisher}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Pages</dt>
                    <dd>{selectedBook.pages}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Added</dt>
                    <dd>{selectedBook.added}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Updated</dt>
                    <dd>{selectedBook.updated}</dd>
                  </div>
                </dl>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-4 py-2 rounded-xl bg-[#8CE2D0] text-black font-semibold">
                    Continue reading
                  </button>
                  <button className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-white">
                    Add to list
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  trend,
  accent = "text-[#8CE2D0]"
}: {
  label: string;
  value: string;
  trend: string;
  accent?: string;
}) => (
  <div className="rounded-2xl border border-[#1f1f1f] bg-[#111111] p-4 shadow-soft-card/10">
    <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-semibold">{value}</span>
      <span className={`text-xs ${accent}`}>{trend}</span>
    </div>
  </div>
);
