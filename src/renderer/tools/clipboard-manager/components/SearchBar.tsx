/**
 * SearchBar - Search input for clipboard history
 */

import type { SearchFilter } from '../types';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  isSearching: boolean;
}

export function SearchBar({ value, onChange, isSearching }: SearchBarProps): JSX.Element {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">
          {isSearching ? '...' : '🔍'}
        </span>
        <input
          type="text"
          className="search-input"
          placeholder="Search clipboard history..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            className="search-clear"
            onClick={() => onChange('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
