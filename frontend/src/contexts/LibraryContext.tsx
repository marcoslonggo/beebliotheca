import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Library } from '../types/library';
import * as librariesApi from '../api/libraries';
import { useAuth } from './AuthContext';

interface LibraryContextType {
  currentLibrary: Library | null;
  libraries: Library[];
  loading: boolean;
  setCurrentLibrary: (library: Library | null) => void;
  refreshLibraries: () => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

interface LibraryProviderProps {
  children: ReactNode;
}

export const LibraryProvider: React.FC<LibraryProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [currentLibrary, setCurrentLibrary] = useState<Library | null>(null);

  // Fetch user's libraries
  const { data: libraries = [], isLoading, refetch } = useQuery({
    queryKey: ['libraries'],
    queryFn: librariesApi.listLibraries,
    enabled: isAuthenticated,
  });

  // Auto-select first library when libraries load
  useEffect(() => {
    if (libraries.length > 0 && !currentLibrary) {
      // Try to restore from localStorage
      const savedLibraryId = localStorage.getItem('current_library_id');
      if (savedLibraryId) {
        const saved = libraries.find(lib => lib.id === savedLibraryId);
        if (saved) {
          setCurrentLibrary(saved);
          return;
        }
      }
      // Otherwise select first library
      setCurrentLibrary(libraries[0]);
    }
  }, [libraries, currentLibrary]);

  // Save current library to localStorage
  useEffect(() => {
    if (currentLibrary) {
      localStorage.setItem('current_library_id', currentLibrary.id);
    }
  }, [currentLibrary]);

  const value: LibraryContextType = {
    currentLibrary,
    libraries,
    loading: isLoading,
    setCurrentLibrary,
    refreshLibraries: refetch,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};
