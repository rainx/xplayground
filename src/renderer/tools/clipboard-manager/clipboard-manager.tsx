/**
 * ClipboardManager - Main component for clipboard manager tool
 */

import { useState, useMemo, useCallback, useEffect, MouseEvent } from 'react';
import { ClipboardStrip } from './components/clipboard-strip';
import { SearchBar } from './components/search-bar';
import { CategoryTabs } from './components/category-tabs';
import { CategorySidebar } from './components/category-sidebar';
import { CategoryDialog } from './components/category-dialog';
import { ContextMenu } from './components/context-menu';
import { useClipboardHistory } from './hooks/use-clipboard-history';
import { useSearch } from './hooks/use-search';
import { useCategories } from './hooks/use-categories';
import { useDragDrop } from './hooks/use-drag-drop';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import type { Category, ClipboardItem, CategoryCreateInput, CategoryUpdateInput } from './types';
import './styles/clipboard-manager.css';

export function ClipboardManager(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    itemId: string;
  } | null>(null);

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
    createCategory,
    updateCategory,
    deleteCategory,
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedItemId: selectedId,
    categories,
    selectedCategoryId,
    onAssignCategory: assignItemToCategory,
    onClearCategories: clearItemCategories,
    onCreateCategory: () => {
      setEditingCategory(undefined);
      setIsDialogOpen(true);
    },
    onSelectCategory: setSelectedCategoryId,
    onDuplicateItem: handleDuplicateItem,
    enabled: !isDialogOpen,
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

  // Category dialog handlers
  const handleOpenCreateDialog = () => {
    setEditingCategory(undefined);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async (data: CategoryCreateInput | CategoryUpdateInput) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data as CategoryUpdateInput);
    } else {
      await createCategory(data as CategoryCreateInput);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = window.confirm('Delete this category? Items will not be deleted.');
    if (confirmed) {
      await deleteCategory(id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
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
    <div className={`clipboard-manager ${isSidebarOpen ? 'with-sidebar' : ''}`}>
      <CategorySidebar
        isOpen={isSidebarOpen}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onEditCategory={handleOpenEditDialog}
        onDeleteCategory={handleDeleteCategory}
        onClose={() => setIsSidebarOpen(false)}
        dropTargetId={dropTargetId}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      <div className="clipboard-main-content">
        <header className="clipboard-header">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              ☰
            </button>
            <h1 className="header-title">Clipboard History</h1>
            <span className="item-count">{displayItems.length} items</span>
          </div>
          <div className="header-center">
            <CategoryTabs
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onAddCategory={handleOpenCreateDialog}
              dropTargetId={dropTargetId}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>
          <div className="header-right">
            <SearchBar
              value={searchFilter.query}
              onChange={handleSearchChange}
              isSearching={isSearching}
            />
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

        <footer className="clipboard-footer">
          <div className="footer-hint">
            <kbd>Enter</kbd> to paste
            <span className="separator">•</span>
            <kbd>←</kbd> <kbd>→</kbd> to navigate
            <span className="separator">•</span>
            <kbd>Delete</kbd> to remove
            <span className="separator">•</span>
            <kbd>⌘1-9</kbd> assign category
            <span className="separator">•</span>
            <kbd>Tab</kbd> switch category
          </div>
        </footer>
      </div>

      <CategoryDialog
        isOpen={isDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        onClose={() => setIsDialogOpen(false)}
      />

      {contextMenu && selectedItem && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          itemId={contextMenu.itemId}
          itemCategoryIds={selectedItem.pinboardIds || []}
          categories={categories}
          onAssignCategory={assignItemToCategory}
          onRemoveCategory={removeItemFromCategory}
          onDuplicate={handleDuplicateItem}
          onDelete={handleDelete}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
