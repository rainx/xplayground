/**
 * ClipboardManager - Main component for clipboard manager tool
 */

import { useState, useMemo } from 'react';
import { ClipboardStrip } from './components/ClipboardStrip';
import { SearchBar } from './components/SearchBar';
import { useClipboardHistory } from './hooks/useClipboardHistory';
import { useSearch } from './hooks/useSearch';
import './styles/clipboard-manager.css';

export function ClipboardManager(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    items,
    loading,
    hasMore,
    loadMore,
    deleteItem,
    pasteItem,
    refresh,
  } = useClipboardHistory();

  const {
    searchResults,
    searchFilter,
    setSearchFilter,
    isSearching,
    clearSearch,
  } = useSearch();

  // Show search results if searching, otherwise show all items
  const displayItems = useMemo(() => {
    if (searchFilter.query) {
      return searchResults;
    }
    return items;
  }, [searchFilter.query, searchResults, items]);

  const handleSearchChange = (query: string) => {
    setSearchFilter({ ...searchFilter, query });
    if (!query) {
      clearSearch();
    }
  };

  const handlePaste = async (id: string) => {
    await pasteItem(id);
    // Optionally show feedback
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <div className="clipboard-manager">
      <header className="clipboard-header">
        <div className="header-left">
          <h1 className="header-title">Clipboard History</h1>
          <span className="item-count">
            {displayItems.length} items
          </span>
        </div>
        <div className="header-center">
          <SearchBar
            value={searchFilter.query}
            onChange={handleSearchChange}
            isSearching={isSearching}
          />
        </div>
        <div className="header-right">
          <button
            className="refresh-btn"
            onClick={refresh}
            disabled={loading}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="clipboard-main">
        <ClipboardStrip
          items={displayItems}
          loading={loading || isSearching}
          hasMore={hasMore && !searchFilter.query}
          selectedId={selectedId}
          onSelectItem={setSelectedId}
          onPasteItem={handlePaste}
          onDeleteItem={handleDelete}
          onLoadMore={loadMore}
        />
      </main>

      <footer className="clipboard-footer">
        <div className="footer-hint">
          <kbd>Enter</kbd> to paste
          <span className="separator">•</span>
          <kbd>←</kbd> <kbd>→</kbd> to navigate
          <span className="separator">•</span>
          <kbd>Delete</kbd> to remove
        </div>
      </footer>
    </div>
  );
}
