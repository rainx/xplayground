/**
 * Hook for searching clipboard history
 */

import { useState, useCallback, useRef } from 'react';
import type { ClipboardItem, SearchFilter } from '../types';

interface UseSearchResult {
  searchResults: ClipboardItem[];
  searchFilter: SearchFilter;
  setSearchFilter: (filter: SearchFilter) => void;
  isSearching: boolean;
  clearSearch: () => void;
}

const DEBOUNCE_MS = 200;

export function useSearch(): UseSearchResult {
  const [searchResults, setSearchResults] = useState<ClipboardItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilterState] = useState<SearchFilter>({
    query: '',
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (filter: SearchFilter) => {
    if (!filter.query && (!filter.contentTypes || filter.contentTypes.length === 0)) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await window.api.clipboard.search(filter);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setSearchFilter = useCallback(
    (filter: SearchFilter) => {
      setSearchFilterState(filter);

      // Clear previous debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the search
      debounceRef.current = setTimeout(() => {
        executeSearch(filter);
      }, DEBOUNCE_MS);
    },
    [executeSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchFilterState({ query: '' });
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    searchFilter,
    setSearchFilter,
    isSearching,
    clearSearch,
  };
}
