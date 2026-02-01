/**
 * ClipboardManager - Main component for clipboard manager tool
 */

import { useState, useMemo, useCallback, useEffect, MouseEvent } from 'react';
import { ClipboardStrip } from './components/clipboard-strip';
import { SearchBar } from './components/search-bar';
import { CategoryTabs } from './components/category-tabs';
import { CategorySidebar } from './components/category-sidebar';
import { CategoryDialog } from './components/category-dialog';
import { ConfirmDialog } from './components/confirm-dialog';
import { ContextMenu } from './components/context-menu';
import { EditDialog } from './components/edit-dialog';
import { AISettingsDialog, AISettings } from './components/ai-settings-dialog';
import { AIPromptDialog } from './components/ai-prompt-dialog';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [editDialogItem, setEditDialogItem] = useState<ClipboardItem | null>(null);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [aiPromptItem, setAIPromptItem] = useState<ClipboardItem | null>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  const {
    items,
    loading,
    hasMore,
    loadMore,
    deleteItem,
    pasteItem,
    refresh,
    clearAll,
    clearCategoryItems,
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

  // Subscribe to item updates
  useEffect(() => {
    const unsubscribe = window.api.clipboard.onItemUpdated(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  // Load AI settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.api.clipboard.getSettings();
      if (settings.aiSettings) {
        setAISettings(settings.aiSettings as AISettings);
      }
    };
    loadSettings();
  }, []);

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
      // Open the first file
      await window.api.shell.openPath(item.fileContent.files[0].path);
    }
  }, [items]);

  // Paste as plain text (writes to clipboard without simulating paste)
  const handlePasteAsPlainText = useCallback(async (itemId: string) => {
    await pasteItem(itemId);
  }, [pasteItem]);

  // Copy item to clipboard (without pasting)
  const handleCopyItem = useCallback(async (itemId: string) => {
    await window.api.clipboard.pasteItem(itemId, { hideWindow: false, simulatePaste: false });
  }, []);

  // Pin/Unpin item (toggle) - TODO: implement when backend supports it
  const handlePinItem = useCallback(async () => {
    // Pin functionality not yet implemented
  }, []);

  // Preview item
  const handlePreviewItem = useCallback(async (itemId: string) => {
    // Select the item and show preview (could open a modal or expand view)
    setSelectedId(itemId);
    // TODO: Implement preview modal
    console.log('Preview functionality - item selected:', itemId);
  }, []);

  // Edit item
  const handleEditItem = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setEditDialogItem(item);
    }
  }, [items]);

  // Save edited item
  const handleSaveEditedItem = useCallback(async (itemId: string, newText: string) => {
    await window.api.clipboard.updateItem(itemId, {
      textContent: {
        plainText: newText,
        characterCount: newText.length,
        lineCount: newText.split('\n').length,
      },
    });
  }, []);

  // AI Modify item - opens prompt dialog
  const handleAIModify = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setAIError(null);
      setAIPromptItem(item);
    }
  }, [items]);

  // Submit AI modification
  const handleAISubmit = useCallback(async (itemId: string, instruction: string) => {
    setIsAIProcessing(true);
    setAIError(null);
    try {
      const result = await window.api.clipboard.aiModify(itemId, instruction);
      if (result.success) {
        setAIPromptItem(null);
      } else {
        setAIError(result.error || 'AI modification failed');
      }
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI modification failed');
    } finally {
      setIsAIProcessing(false);
    }
  }, []);

  // Save AI settings
  const handleSaveAISettings = useCallback(async (settings: AISettings) => {
    await window.api.clipboard.updateSettings({ aiSettings: settings });
    setAISettings(settings);
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

  // Clear handlers
  const handleClearClick = useCallback(() => {
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
    const itemCount = displayItems.length;

    if (itemCount === 0) return;

    if (selectedCategoryId && selectedCategory) {
      // Clear items in the selected category
      setConfirmDialog({
        isOpen: true,
        title: 'Clear Category Items',
        message: `Delete all ${itemCount} item${itemCount !== 1 ? 's' : ''} in "${selectedCategory.name}"? This action cannot be undone.`,
        onConfirm: async () => {
          await clearCategoryItems(selectedCategoryId);
          setConfirmDialog(null);
        },
      });
    } else {
      // Clear all items
      setConfirmDialog({
        isOpen: true,
        title: 'Clear All History',
        message: `Delete all ${itemCount} item${itemCount !== 1 ? 's' : ''} from clipboard history? This action cannot be undone.`,
        onConfirm: async () => {
          await clearAll();
          setConfirmDialog(null);
        },
      });
    }
  }, [selectedCategoryId, categories, displayItems.length, clearAll, clearCategoryItems]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
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
              className="settings-btn"
              onClick={() => setIsAISettingsOpen(true)}
              title="AI Settings"
            >
              ⚙️
            </button>
            <button
              className="clear-btn"
              onClick={handleClearClick}
              disabled={loading || displayItems.length === 0}
              title={selectedCategoryId ? 'Clear category items' : 'Clear all history'}
            >
              🗑
            </button>
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
          item={selectedItem}
          categories={categories}
          onPaste={handlePaste}
          onPasteAsPlainText={handlePasteAsPlainText}
          onCopy={handleCopyItem}
          onOpen={handleOpenItem}
          onEdit={handleEditItem}
          onAIModify={handleAIModify}
          onAssignCategory={assignItemToCategory}
          onRemoveCategory={removeItemFromCategory}
          onDuplicate={handleDuplicateItem}
          onDelete={handleDelete}
          onPin={handlePinItem}
          onPreview={handlePreviewItem}
          onClose={closeContextMenu}
        />
      )}

      <EditDialog
        isOpen={!!editDialogItem}
        item={editDialogItem}
        onSave={handleSaveEditedItem}
        onClose={() => setEditDialogItem(null)}
      />

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirmDialog}
        />
      )}

      <AISettingsDialog
        isOpen={isAISettingsOpen}
        settings={aiSettings}
        onSave={handleSaveAISettings}
        onClose={() => setIsAISettingsOpen(false)}
      />

      <AIPromptDialog
        isOpen={!!aiPromptItem}
        item={aiPromptItem}
        onSubmit={handleAISubmit}
        onClose={() => {
          setAIPromptItem(null);
          setAIError(null);
        }}
        isProcessing={isAIProcessing}
        error={aiError}
      />
    </div>
  );
}
