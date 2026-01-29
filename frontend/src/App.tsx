import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LibraryProvider } from "./contexts/LibraryContext";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const BooksPage = lazy(() => import("./pages/books/BooksPage"));
const BookDetailPage = lazy(() => import("./pages/books/BookDetailPage"));
const SeriesPage = lazy(() => import("./pages/series/SeriesPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const LibrariesPage = lazy(() => import("./pages/libraries/LibrariesPage"));
const ListsPage = lazy(() => import("./pages/lists/ListsPage"));
const BookClubsPage = lazy(() => import("./pages/bookClubs/BookClubsPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const BeebliothecaPreview = lazy(() => import("./pages/experimental/BeebliothecaPreview"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen bg-coal">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey"></div>
  </div>
);

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LibraryProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Auth routes - no layout */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes with layout */}
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/:bookId" element={<BookDetailPage />} />
                <Route path="/lists" element={<ListsPage />} />
                <Route path="/book-clubs" element={<BookClubsPage />} />
                <Route path="/series" element={<SeriesPage />} />
                <Route path="/libraries" element={<LibrariesPage />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminUsersPage />
                    </RequireAdmin>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Preview route - separate route without layout */}
              <Route path="/preview/beebliotheca" element={<BeebliothecaPreview />} />
            </Routes>
          </Suspense>
        </LibraryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
