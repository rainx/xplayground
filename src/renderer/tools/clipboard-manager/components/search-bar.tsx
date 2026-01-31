/**
 * SearchBar - Search input for clipboard history
 */

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  isSearching: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export function SearchBar({ value, onChange, isSearching, onFocusChange }: SearchBarProps): JSX.Element {
  const handleFocus = () => {
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    onFocusChange?.(false);
  };

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
          onFocus={handleFocus}
          onBlur={handleBlur}
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
