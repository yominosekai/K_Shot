'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  setSearchValueAndFocus: ((value: string) => void) | null;
  registerSetSearchValueAndFocus: (fn: (value: string) => void) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [setSearchValueAndFocusFn, setSetSearchValueAndFocusFn] = useState<((value: string) => void) | null>(null);

  const registerSetSearchValueAndFocus = useCallback((fn: (value: string) => void) => {
    setSetSearchValueAndFocusFn(() => fn);
  }, []);

  const value: SearchContextType = {
    setSearchValueAndFocus: setSearchValueAndFocusFn,
    registerSetSearchValueAndFocus,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

