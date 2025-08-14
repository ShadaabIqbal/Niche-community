import React, { createContext, useContext, useState } from 'react';

const CommunitiesSearchContext = createContext();

export function useCommunitiesSearch() {
  return useContext(CommunitiesSearchContext);
}

export function CommunitiesSearchProvider({ children }) {
  const [navbarSearch, setNavbarSearch] = useState('');

  const value = {
    navbarSearch,
    setNavbarSearch
  };

  return (
    <CommunitiesSearchContext.Provider value={value}>
      {children}
    </CommunitiesSearchContext.Provider>
  );
} 