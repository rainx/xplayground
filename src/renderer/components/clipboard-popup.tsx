/**
 * ClipboardPopup - Minimal clipboard popup triggered by global hotkey
 * Shows only clipboard items without sidebar, designed to slide in from bottom
 */

import { useState, useMemo, useCallback, useEffect, MouseEvent } from 'react';
import { ClipboardStrip } from '../tools/clipboard-manager/components/clipboard-strip';
import { SearchBar } from '../tools/clipboard-manager/components/search-bar';
import { CategoryTabs } from '../tools/clipboard-manager/components/category-tabs';
import { ContextMenu } from '../tools/clipboard-manager/components/context-menu';
import { useClipboardHistory } from '../tools/clipboard-manager/hooks/use-clipboard-history';
import { useSearch } from '../tools/clipboard-manager/hooks/use-search';
import { useCategories } from '../tools/clipboard-manager/hooks/use-categories';
import { useDragDrop } from '../tools/clipboard-manager/hooks/use-drag-drop';
import { useKeyboardShortcuts } from '../tools/clipboard-manager/hooks/use-keyboard-shortcuts';
import type { ClipboardItem } from '../tools/clipboard-manager/types';
import '../tools/clipboard-manager/styles/clipboard-manager.css';

export function ClipboardPopup(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    itemId: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger slide-in animation after mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

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

  const {
    categories,
    assignItemToCategory,
    removeItemFromCategory,
    clearItemCategories,
  } = useCategories();

  // Subscribe to item category changes
  useEffect(() => {
    const unsubscribe = window.api.clipboard.onItemCategoryChanged(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  // Drag and drop
  const handleDropItemToCategory = useCallback(
    async (itemId: string, categoryId: string) => {
      await assignItemToCategory(itemId, categoryId);
    },
    [assignItemToCategory]
  );

  const {
    draggedItemId,
    dropTargetId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useDragDrop({ onDrop: handleDropItemToCategory });

  // Duplicate item
  const handleDuplicateItem = useCallback(async (itemId: string) => {
    await window.api.clipboard.duplicateItem(itemId);
  }, []);

  // Open item (for links and files)
  const handleOpenItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.type === 'link' && item.linkContent?.url) {
      await window.api.shell.openExternal(item.linkContent.url);
    } else if (item.type === 'file' && item.fileContent?.files.length) {
      await window.api.shell.openPath(item.fileContent.files[0].path);
    }
  }, [items]);

  // Paste as plain text
  const handlePasteAsPlainText = useCallback(async (itemId: string) => {
    await pasteItem(itemId);
  }, [pasteItem]);

  // Copy item to clipboard (without pasting)
  const handleCopyItem = useCallback(async (itemId: string) => {
    await window.api.clipboard.pasteItem(itemId, { hideWindow: false, simulatePaste: false });
  }, []);

  // Pin/Unpin item (toggle)
  const handlePinItem = useCallback(async (_itemId: string) => {
    console.log('Pin functionality not yet implemented');
  }, []);

  // Preview item
  const handlePreviewItem = useCallback(async (itemId: string) => {
    setSelectedId(itemId);
    console.log('Preview functionality - item selected:', itemId);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedItemId: selectedId,
    categories,
    selectedCategoryId,
    onAssignCategory: assignItemToCategory,
    onClearCategories: clearItemCategories,
    onCreateCategory: () => {},
    onSelectCategory: setSelectedCategoryId,
    onDuplicateItem: handleDuplicateItem,
    enabled: !contextMenu?.isOpen,
  });

  // Filter items by category
  const displayItems = useMemo(() => {
    let result: ClipboardItem[];

    if (searchFilter.query) {
      result = searchResults;
    } else {
      result = items;
    }

    // Filter by selected category
    if (selectedCategoryId) {
      result = result.filter(
        (item) => item.pinboardIds && item.pinboardIds.includes(selectedCategoryId)
      );
    }

    return result;
  }, [searchFilter.query, searchResults, items, selectedCategoryId]);

  // Handle keyboard navigation from main process
  // (since the window is non-focusable, it uses global shortcuts)
  useEffect(() => {
    const unsubNavigate = window.api.popup.onNavigate((direction) => {
      if (!displayItems.length) return;

      const currentIndex = selectedId
        ? displayItems.findIndex((item) => item.id === selectedId)
        : -1;

      let newIndex: number;
      if (direction === 'left' || direction === 'up') {
        newIndex = currentIndex <= 0 ? displayItems.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex >= displayItems.length - 1 ? 0 : currentIndex + 1;
      }

      setSelectedId(displayItems[newIndex].id);
    });

    const unsubSelect = window.api.popup.onSelect(() => {
      if (selectedId) {
        pasteItem(selectedId);
      }
    });

    return () => {
      unsubNavigate();
      unsubSelect();
    };
  }, [displayItems, selectedId, pasteItem]);

  const handleSearchChange = (query: string) => {
    setSearchFilter({ ...searchFilter, query });
    if (!query) {
      clearSearch();
    }
  };

  const handlePaste = async (id: string) => {
    await pasteItem(id);
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
    if (contextMenu?.itemId === id) {
      setContextMenu(null);
    }
  };

  // Context menu handlers
  const handleContextMenu = useCallback((e: MouseEvent, itemId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      itemId,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const selectedItem = useMemo(() => {
    if (!contextMenu) return null;
    return items.find((i) => i.id === contextMenu.itemId) || null;
  }, [contextMenu, items]);

  return (
    <div className={`clipboard-popup ${isVisible ? 'visible' : ''}`}>
      <div className="popup-drag-handle" />

      <header className="popup-header">
        <div className="popup-header-left">
          <CategoryTabs
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onAddCategory={() => {}}
            dropTargetId={dropTargetId}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        </div>
        <div className="popup-header-right">
          <SearchBar
            value={searchFilter.query}
            onChange={handleSearchChange}
            isSearching={isSearching}
          />
        </div>
      </header>

      <main className="popup-main">
        <ClipboardStrip
          items={displayItems}
          loading={loading || isSearching}
          hasMore={hasMore && !searchFilter.query && !selectedCategoryId}
          selectedId={selectedId}
          categories={categories}
          draggedItemId={draggedItemId}
          onSelectItem={setSelectedId}
          onPasteItem={handlePaste}
          onDeleteItem={handleDelete}
          onLoadMore={loadMore}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onContextMenu={handleContextMenu}
        />
      </main>

      <footer className="popup-footer">
        <div className="popup-hint">
          <kbd>Enter</kbd> paste
          <span className="separator">•</span>
          <kbd>←</kbd><kbd>→</kbd> navigate
          <span className="separator">•</span>
          <kbd>Esc</kbd> close
        </div>
      </footer>

      {contextMenu && selectedItem && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          item={selectedItem}
          categories={categories}
          onPaste={handlePaste}
          onPasteAsPlainText={handlePasteAsPlainText}
          onCopy={handleCopyItem}
          onOpen={handleOpenItem}
          onAssignCategory={assignItemToCategory}
          onRemoveCategory={removeItemFromCategory}
          onDuplicate={handleDuplicateItem}
          onDelete={handleDelete}
          onPin={handlePinItem}
          onPreview={handlePreviewItem}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
