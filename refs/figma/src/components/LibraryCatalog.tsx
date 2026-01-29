import { Search, Plus, Edit, Trash2, BookmarkCheck, BookOpen, ChevronDown, Library, Settings, X, RefreshCw, Grid3x3, List, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useState } from 'react';
import { useTheme } from './ThemeContext';

interface Book {
  id: string;
  title: string;
  author: string;
  loan: 'Available' | 'Loaned';
  subjects: string[];
  metadata: 'complete' | 'incomplete';
  status: 'To read' | 'Reading' | 'Up next' | 'Read' | 'Reread' | 'Abandoned';
  condition: 'To check' | 'Wanted' | 'Owned';
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
    id: '1',
    title: 'The Body Keeps the Score',
    author: 'Bessel A. van der Kolk',
    loan: 'Available',
    subjects: ['Medicine'],
    metadata: 'complete',
    status: 'Read',
    condition: 'Owned',
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    isbn: '9780143127741',
    publisher: 'Penguin Books',
    publicationDate: '2015-09-08',
    description: 'Originally published by Viking Penguin, 2014.',
    language: 'en',
    added: '11/4/2025',
    updated: '11/7/2025',
    pages: 464
  },
  {
    id: '2',
    title: 'Where the Crawdads Sing',
    author: 'Delia Owens',
    loan: 'Available',
    subjects: ['Fiction'],
    metadata: 'complete',
    status: 'Reading',
    condition: 'Owned',
    coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    isbn: '9780735219090',
    publisher: 'G.P. Putnam\'s Sons',
    publicationDate: '2018-08-14',
    description: 'A coming-of-age story set in the marshlands of North Carolina.',
    language: 'en',
    added: '10/15/2025',
    updated: '11/6/2025',
    pages: 384
  },
  {
    id: '3',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    loan: 'Available',
    subjects: ['Science', 'History'],
    metadata: 'complete',
    status: 'To read',
    condition: 'Wanted',
    coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
    isbn: '9780062316097',
    publisher: 'Harper',
    publicationDate: '2015-02-10',
    description: 'A brief history of humankind from the Stone Age to the modern age.',
    language: 'en',
    added: '11/1/2025',
    updated: '11/1/2025',
    pages: 512
  },
  {
    id: '4',
    title: 'Educated',
    author: 'Tara Westover',
    loan: 'Available',
    subjects: ['Biography', 'Memoir'],
    metadata: 'complete',
    status: 'Up next',
    condition: 'Owned',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    isbn: '9780399590504',
    publisher: 'Random House',
    publicationDate: '2018-02-20',
    description: 'A memoir about a young woman who leaves her survivalist family.',
    language: 'en',
    added: '10/20/2025',
    updated: '11/5/2025',
    pages: 352
  },
  {
    id: '5',
    title: 'Atomic Habits',
    author: 'James Clear',
    loan: 'Loaned',
    subjects: ['Self-help', 'Psychology'],
    metadata: 'complete',
    status: 'Reread',
    condition: 'Owned',
    coverImage: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    isbn: '9780735211292',
    publisher: 'Avery',
    publicationDate: '2018-10-16',
    description: 'An easy and proven way to build good habits and break bad ones.',
    language: 'en',
    added: '9/5/2025',
    updated: '10/28/2025',
    pages: 320
  },
  {
    id: '6',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    loan: 'Available',
    subjects: ['Fiction', 'Fantasy'],
    metadata: 'incomplete',
    status: 'Abandoned',
    condition: 'To check',
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400',
    isbn: '9780525559474',
    publisher: 'Viking',
    publicationDate: '2020-09-29',
    description: 'A novel about all the choices that go into a life well lived.',
    language: 'en',
    added: '10/10/2025',
    updated: '11/3/2025',
    pages: 288
  }
];

const libraries = [
  { id: '1', name: 'Test michele' },
  { id: '2', name: 'test' }
];

export function LibraryCatalog() {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'series' | 'none'>('none');
  const [selectedLibrary, setSelectedLibrary] = useState(libraries[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isBookInfoOpen, setIsBookInfoOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [bookTypeFilter, setBookTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title-az');
  
  // Filter books based on all filters
  let filteredBooks = mockBooks.filter(book => {
    const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
    const matchesCondition = conditionFilter === 'all' || book.condition === conditionFilter;
    const matchesAuthor = authorFilter === 'all' || book.author === authorFilter;
    const matchesLanguage = languageFilter === 'all' || book.language === languageFilter;
    const matchesSearch = searchTerm === '' || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesCondition && matchesAuthor && matchesLanguage && matchesSearch;
  });
  
  // Sort books based on selected option
  filteredBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title-az':
        return a.title.localeCompare(b.title);
      case 'title-za':
        return b.title.localeCompare(a.title);
      case 'latest-added':
        return new Date(b.added || '').getTime() - new Date(a.added || '').getTime();
      case 'earliest-added':
        return new Date(a.added || '').getTime() - new Date(b.added || '').getTime();
      case 'author-az':
        return a.author.localeCompare(b.author);
      case 'author-za':
        return b.author.localeCompare(a.author);
      case 'pubdate-earliest':
        return new Date(a.publicationDate || '').getTime() - new Date(b.publicationDate || '').getTime();
      case 'pubdate-latest':
        return new Date(b.publicationDate || '').getTime() - new Date(a.publicationDate || '').getTime();
      case 'pages-low':
        return (a.pages || 0) - (b.pages || 0);
      case 'pages-high':
        return (b.pages || 0) - (a.pages || 0);
      default:
        return 0;
    }
  });
  
  // Get unique authors and languages for filter options
  const uniqueAuthors = Array.from(new Set(mockBooks.map(book => book.author))).sort();
  const uniqueLanguages = Array.from(new Set(mockBooks.map(book => book.language).filter(Boolean))).sort();

  const totalBooks = mockBooks.length;
  const favorites = 0;
  const firstRead = mockBooks.filter(b => b.status === 'To read').length;
  const currentlyReading = mockBooks.filter(b => b.status === 'Reading').length;
  const loaned = mockBooks.filter(b => b.loan === 'Loaned').length;
  const owned = mockBooks.filter(b => b.condition === 'Owned').length;

  return (
    <div className={`flex-1 min-h-screen flex ${
      theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-50'
    }`}>
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className={`px-6 py-4 border-b ${
        theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-2xl ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Library Catalog</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]">
                <Plus className="w-4 h-4 mr-2" />
                New Book
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Search</DropdownMenuItem>
              <DropdownMenuItem>Scam</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Library Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-2 border px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a]'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}>
                <Library className="w-4 h-4 text-[#8CE2D0]" />
                <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  {selectedLibrary.name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={`w-72 ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
            }`} align="start">
              <DropdownMenuLabel className={`text-xs uppercase px-3 py-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Your Libraries
              </DropdownMenuLabel>
              {libraries.map((library) => (
                <DropdownMenuItem
                  key={library.id}
                  onClick={() => setSelectedLibrary(library)}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer ${
                    selectedLibrary.id === library.id 
                      ? theme === 'dark'
                        ? 'bg-[#2a3a3a] text-white'
                        : 'bg-gray-100 text-gray-900'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222] hover:text-white'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Library className="w-4 h-4" />
                  <span>{library.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className={`my-1 ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'
              }`} />
              <DropdownMenuItem className={`flex items-center gap-3 px-3 py-3 cursor-pointer ${
                theme === 'dark' 
                  ? 'text-gray-300 hover:bg-[#222] hover:text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}>
                <Settings className="w-4 h-4" />
                <span>Manage Libraries</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search by title, author, subject, series..." 
              className={`pl-10 w-96 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-6">
          <label className={`flex items-center gap-2 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <input type="checkbox" className="rounded" />
            Group by Series
          </label>
          <label className={`flex items-center gap-2 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <input type="checkbox" className="rounded" />
            Collapse Series
          </label>
          
          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <div className={`flex rounded-lg border overflow-hidden ${
              theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 flex items-center gap-2 transition-colors ${
                  viewMode === 'table'
                    ? theme === 'dark'
                      ? 'bg-[#8CE2D0] text-black'
                      : 'bg-[#8CE2D0] text-black'
                    : theme === 'dark'
                      ? 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm">Table</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 flex items-center gap-2 transition-colors ${
                  viewMode === 'grid'
                    ? theme === 'dark'
                      ? 'bg-[#8CE2D0] text-black'
                      : 'bg-[#8CE2D0] text-black'
                    : theme === 'dark'
                      ? 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="text-sm">Grid</span>
              </button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-black hover:text-black bg-[rgba(196,121,120,0.9)] hover:bg-[rgba(196,121,120,1)] flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`w-56 ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
              }`}>
                <DropdownMenuLabel className={`text-xs uppercase ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Sort by
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'} />
                <DropdownMenuItem
                  onClick={() => setSortBy('title-az')}
                  className={`cursor-pointer ${
                    sortBy === 'title-az'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Title: A-Z
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('title-za')}
                  className={`cursor-pointer ${
                    sortBy === 'title-za'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Title: Z-A
                </DropdownMenuItem>
                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'} />
                <DropdownMenuItem
                  onClick={() => setSortBy('latest-added')}
                  className={`cursor-pointer ${
                    sortBy === 'latest-added'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Latest added
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('earliest-added')}
                  className={`cursor-pointer ${
                    sortBy === 'earliest-added'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Earliest added
                </DropdownMenuItem>
                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'} />
                <DropdownMenuItem
                  onClick={() => setSortBy('author-az')}
                  className={`cursor-pointer ${
                    sortBy === 'author-az'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Authors: A-Z
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('author-za')}
                  className={`cursor-pointer ${
                    sortBy === 'author-za'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Authors: Z-A
                </DropdownMenuItem>
                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'} />
                <DropdownMenuItem
                  onClick={() => setSortBy('pubdate-earliest')}
                  className={`cursor-pointer ${
                    sortBy === 'pubdate-earliest'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Pub Date: Earliest first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('pubdate-latest')}
                  className={`cursor-pointer ${
                    sortBy === 'pubdate-latest'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Pub Date: Latest first
                </DropdownMenuItem>
                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-200'} />
                <DropdownMenuItem
                  onClick={() => setSortBy('pages-low')}
                  className={`cursor-pointer ${
                    sortBy === 'pages-low'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Pages: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy('pages-high')}
                  className={`cursor-pointer ${
                    sortBy === 'pages-high'
                      ? theme === 'dark'
                        ? 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                        : 'bg-[#8CE2D0]/20 text-[#8CE2D0]'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:bg-[#222]'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Pages: High to Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
              className={`flex items-center gap-2 transition-colors text-black ${
                isFilterSidebarOpen
                  ? 'bg-[#8CE2D0] hover:bg-[#8CE2D0]'
                  : 'bg-[rgba(196,121,120,0.9)] hover:bg-[rgba(196,121,120,1)]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Stats with honeycomb accent */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className={`rounded-lg p-4 border relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[#1a2a3a] to-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-gradient-to-br from-blue-50 to-white border-gray-200'
          }`}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#8CE2D0]" />
              </svg>
            </div>
            <p className={`text-xs mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Total Books</p>
            <p className={`text-3xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{totalBooks}</p>
          </div>
          <div className={`rounded-lg p-4 border relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[#3a2a1a] to-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-gradient-to-br from-orange-50 to-white border-gray-200'
          }`}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#C47978]" />
              </svg>
            </div>
            <p className={`text-xs mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Owned</p>
            <p className={`text-3xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{owned}</p>
          </div>
          <div className={`rounded-lg p-4 border relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[#1a3a2a] to-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-gradient-to-br from-teal-50 to-white border-gray-200'
          }`}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#8CE2D0]" />
              </svg>
            </div>
            <p className={`text-xs mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Read</p>
            <p className={`text-3xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{firstRead}</p>
          </div>
          <div className={`rounded-lg p-4 border relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[#2a3a2a] to-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-gradient-to-br from-green-50 to-white border-gray-200'
          }`}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#8CE2D0]" />
              </svg>
            </div>
            <p className={`text-xs mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Currently Reading</p>
            <p className={`text-3xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{currentlyReading}</p>
          </div>
          <div className={`rounded-lg p-4 border relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[#2a1a1a] to-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-gradient-to-br from-red-50 to-white border-gray-200'
          }`}>
            <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="currentColor" className="text-[#BC6B6B]" />
              </svg>
            </div>
            <p className={`text-xs mb-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Loaned</p>
            <p className={`text-3xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{loaned}</p>
          </div>
        </div>

        {/* Books View - Table or Grid */}
        {viewMode === 'table' ? (
          /* Table View */
          <div className={`rounded-lg border overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#1a1a1a] border-[#2a2a2a]'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr_120px_120px_120px] gap-4 px-4 py-3 border-b ${
              theme === 'dark'
                ? 'bg-[#0f0f0f] border-[#2a2a2a]'
                : 'bg-gray-50 border-gray-200'
            }`}>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Cover</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Title</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Author</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Loan</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Subjects</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Metadata</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Status</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Condition</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Actions</p>
          </div>
          
          {filteredBooks.map((book) => (
            <div key={book.id} className={`grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr_120px_120px_120px] gap-4 px-4 py-2 border-b transition-colors items-center ${
              theme === 'dark'
                ? 'border-[#2a2a2a] hover:bg-[#222]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <div 
                className={`w-10 h-14 rounded overflow-hidden border-2 border-[#8CE2D0]/30 cursor-pointer hover:border-[#8CE2D0] transition-colors ${
                  theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedBook(book);
                  setIsBookInfoOpen(true);
                }}
              >
                <ImageWithFallback 
                  src={book.coverImage || ''} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p 
                className={`text-sm cursor-pointer hover:text-[#8CE2D0] transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
                onClick={() => {
                  setSelectedBook(book);
                  setIsBookInfoOpen(true);
                }}
              >{book.title}</p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>{book.author}</p>
              <Badge className={`w-fit border ${
                theme === 'dark'
                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/40 border-green-700/50'
                  : 'bg-gray-700 text-gray-100 hover:bg-gray-800 border-gray-600'
              }`}>
                {book.loan}
              </Badge>
              <div className="flex flex-wrap gap-1">
                {book.subjects.map((subject, idx) => (
                  <Badge key={idx} variant="secondary" className={`text-xs ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                    {subject}
                  </Badge>
                ))}
              </div>
              <Badge className={`w-fit border ${
                theme === 'dark'
                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/40 border-green-700/50'
                  : 'bg-gray-700 text-gray-100 hover:bg-gray-800 border-gray-600'
              }`}>
                {book.metadata}
              </Badge>
              <select 
                className={`px-2 py-1 rounded border text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                value={book.status}
                onChange={(e) => {/* Handle status change */}}
              >
                <option value="To read">To read</option>
                <option value="Reading">Reading</option>
                <option value="Up next">Up next</option>
                <option value="Read">Read</option>
                <option value="Reread">Reread</option>
                <option value="Abandoned">Abandoned</option>
              </select>
              <select 
                className={`px-2 py-1 rounded border text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                value={book.condition}
                onChange={(e) => {/* Handle condition change */}}
              >
                <option value="To check">To check</option>
                <option value="Wanted">Wanted</option>
                <option value="Owned">Owned</option>
              </select>
              <div className="flex items-center gap-2">
                <button className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-[#8CE2D0]'
                    : 'text-gray-500 hover:text-[#8CE2D0]'
                }`}>
                  <Edit className="w-4 h-4" />
                </button>
                <button className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-[#BC6B6B]'
                    : 'text-gray-500 hover:text-[#BC6B6B]'
                }`}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <button className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-[#C47978]'
                    : 'text-gray-500 hover:text-[#C47978]'
                }`}>
                  <BookmarkCheck className="w-4 h-4" />
                </button>
                <button className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}>
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 gap-4">
            {filteredBooks.map((book) => (
              <div 
                key={book.id} 
                className="group cursor-pointer"
                onClick={() => {
                  setSelectedBook(book);
                  setIsBookInfoOpen(true);
                }}
              >
                <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-[#8CE2D0]/30 group-hover:border-[#8CE2D0] group-hover:shadow-lg group-hover:shadow-[#8CE2D0]/20' 
                    : 'bg-gray-100 border-gray-200 group-hover:border-[#8CE2D0] group-hover:shadow-lg group-hover:shadow-[#8CE2D0]/20'
                }`}>
                  <ImageWithFallback 
                    src={book.coverImage || ''} 
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2">
                  <p className={`text-sm line-clamp-2 transition-colors ${
                    theme === 'dark' 
                      ? 'text-white group-hover:text-[#8CE2D0]' 
                      : 'text-gray-900 group-hover:text-[#8CE2D0]'
                  }`}>{book.title}</p>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Filter Sidebar */}
      <div className={`transition-all duration-300 ${
        isFilterSidebarOpen ? 'w-64' : 'w-0'
      } overflow-hidden border-l ${
        theme === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
      }`}>
        <div className="w-64 p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </h2>
            <button
              onClick={() => setIsFilterSidebarOpen(false)}
              className={`transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-xs mb-1.5 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Status</label>
            <select 
              className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                theme === 'dark'
                  ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="To read">To read</option>
              <option value="Reading">Reading</option>
              <option value="Up next">Up next</option>
              <option value="Read">Read</option>
              <option value="Reread">Reread</option>
              <option value="Abandoned">Abandoned</option>
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className={`block text-xs mb-1.5 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Condition</label>
            <select 
              className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                theme === 'dark'
                  ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
            >
              <option value="all">All Conditions</option>
              <option value="To check">To check</option>
              <option value="Wanted">Wanted</option>
              <option value="Owned">Owned</option>
            </select>
          </div>

          {/* Author Filter */}
          <div>
            <label className={`block text-xs mb-1.5 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Author</label>
            <select 
              className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                theme === 'dark'
                  ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
            >
              <option value="all">All Authors</option>
              {uniqueAuthors.map((author) => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className={`block text-xs mb-1.5 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Language</label>
            <select 
              className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                theme === 'dark'
                  ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <option value="all">All Languages</option>
              {uniqueLanguages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </div>

          {/* Book Type Filter */}
          <div>
            <label className={`block text-xs mb-1.5 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Book Type</label>
            <select 
              className={`w-full px-2.5 py-1.5 rounded border text-xs ${
                theme === 'dark'
                  ? 'bg-[#0f0f0f] border-[#2a2a2a] text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              value={bookTypeFilter}
              onChange={(e) => setBookTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="hardcover">Hardcover</option>
              <option value="paperback">Paperback</option>
              <option value="ebook">E-book</option>
              <option value="audiobook">Audiobook</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="pt-3 border-t border-[#2a2a2a]">
            <Button 
              variant="outline" 
              className="w-full text-xs"
              onClick={() => {
                setStatusFilter('all');
                setConditionFilter('all');
                setAuthorFilter('all');
                setLanguageFilter('all');
                setBookTypeFilter('all');
              }}
            >
              Reset All Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Book Info Modal */}
      <Dialog open={isBookInfoOpen} onOpenChange={setIsBookInfoOpen}>
        <DialogContent className={`max-w-5xl ${
          theme === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'
        }`}>
          <DialogHeader className="border-b border-[#8CE2D0] pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                Book Info
              </DialogTitle>
              <button
                onClick={() => setIsBookInfoOpen(false)}
                className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DialogDescription className="sr-only">
              View detailed information about the selected book
            </DialogDescription>
          </DialogHeader>

          {selectedBook && (
            <div className="flex gap-6 py-4">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                <div className={`w-64 h-96 rounded-lg overflow-hidden border-2 border-[#8CE2D0]/30 ${
                  theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'
                }`}>
                  <ImageWithFallback 
                    src={selectedBook.coverImage || ''} 
                    alt={selectedBook.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Book Details */}
              <div className="flex-1 space-y-4">
                {/* Title and Badges */}
                <div>
                  <h2 className={`text-2xl mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{selectedBook.title}</h2>
                  <div className="flex gap-2 mb-4">
                    <Badge className={`${
                      selectedBook.loan === 'Available' 
                        ? 'bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]' 
                        : 'bg-[#BC6B6B] text-white hover:bg-[#a85a5a]'
                    }`}>
                      {selectedBook.loan}
                    </Badge>
                    <Badge className={`${
                      selectedBook.metadata === 'complete'
                        ? 'bg-[#8CE2D0] text-black hover:bg-[#7dd1bf]'
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}>
                      {selectedBook.metadata}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className={`gap-2 ${
                      theme === 'dark'
                        ? 'border-[#2a2a2a] hover:bg-[#2a2a2a] text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className={`gap-2 ${
                      theme === 'dark'
                        ? 'border-[#2a2a2a] hover:bg-[#2a2a2a] text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <RefreshCw className="w-4 h-4" />
                      Enrich
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 border-[#BC6B6B] text-[#BC6B6B] hover:bg-[#BC6B6B] hover:text-white">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Book Information */}
                <div className="space-y-3 border-t pt-4 border-[#2a2a2a]">
                  <div>
                    <p className={`text-sm mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Author(s)</p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{selectedBook.author}</p>
                  </div>

                  {selectedBook.isbn && (
                    <div>
                      <p className={`text-sm mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>ISBN/Identifier</p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{selectedBook.isbn}</p>
                    </div>
                  )}

                  {selectedBook.publisher && (
                    <div>
                      <p className={`text-sm mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Publisher</p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{selectedBook.publisher}</p>
                    </div>
                  )}

                  {selectedBook.publicationDate && (
                    <div>
                      <p className={`text-sm mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Publication Date</p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{selectedBook.publicationDate}</p>
                    </div>
                  )}

                  <div>
                    <p className={`text-sm mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Subjects</p>
                    <div className="flex gap-2">
                      {selectedBook.subjects.map((subject, index) => (
                        <Badge key={index} variant="secondary" className={
                          theme === 'dark'
                            ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }>
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedBook.description && (
                    <div>
                      <p className={`text-sm mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Description</p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{selectedBook.description}</p>
                    </div>
                  )}

                  {selectedBook.language && (
                    <div>
                      <p className={`text-sm mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>Language</p>
                      <Badge variant="secondary" className={
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-gray-300'
                          : 'bg-gray-200 text-gray-700'
                      }>
                        {selectedBook.language}
                      </Badge>
                    </div>
                  )}

                  <div className="border-t pt-3 border-[#2a2a2a]">
                    <p className={`text-sm mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Ownership Status</p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{selectedBook.condition}</p>
                  </div>

                  {(selectedBook.added || selectedBook.updated) && (
                    <div className="border-t pt-3 space-y-2 border-[#2a2a2a]">
                      {selectedBook.added && (
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>Added: {selectedBook.added}</p>
                      )}
                      {selectedBook.updated && (
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>Updated: {selectedBook.updated}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
