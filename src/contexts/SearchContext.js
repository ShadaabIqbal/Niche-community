import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function useSearch() {
  return useContext(SearchContext);
}

export function SearchProvider({ children }) {
  const [search, setSearch] = useState('');

  const value = {
    search,
    setSearch
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
} 