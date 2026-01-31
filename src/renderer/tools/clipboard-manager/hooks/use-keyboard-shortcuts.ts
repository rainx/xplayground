/**
 * Hook for clipboard manager keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';
import type { Category } from '../types';

interface UseKeyboardShortcutsOptions {
  selectedItemId: string | null;
  categories: Category[];
  selectedCategoryId: string | null;
  onAssignCategory: (itemId: string, categoryId: string) => void;
  onClearCategories: (itemId: string) => void;
  onCreateCategory: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  onDuplicateItem: (itemId: string) => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedItemId,
  categories,
  selectedCategoryId,
  onAssignCategory,
  onClearCategories,
  onCreateCategory,
  onSelectCategory,
  onDuplicateItem,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check for Cmd/Ctrl modifier
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+1-9: Assign to category
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (categories[index] && selectedItemId) {
          onAssignCategory(selectedItemId, categories[index].id);
        }
        return;
      }

      // Cmd+0: Clear all categories from item
      if (isMod && e.key === '0') {
        e.preventDefault();
        if (selectedItemId) {
          onClearCategories(selectedItemId);
        }
        return;
      }

      // Cmd+N: Create new category
      if (isMod && e.key === 'n') {
        e.preventDefault();
        onCreateCategory();
        return;
      }

      // Cmd+D: Duplicate selected item
      if (isMod && e.key === 'd') {
        e.preventDefault();
        if (selectedItemId) {
          onDuplicateItem(selectedItemId);
        }
        return;
      }

      // Tab / Shift+Tab: Navigate between categories
      if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = selectedCategoryId
          ? categories.findIndex((c) => c.id === selectedCategoryId)
          : -1;

        if (e.shiftKey) {
          // Previous category
          if (currentIndex <= 0) {
            // Go to "All" (null)
            onSelectCategory(null);
          } else {
            onSelectCategory(categories[currentIndex - 1].id);
          }
        } else {
          // Next category
          if (currentIndex === -1) {
            // From "All" to first category
            if (categories.length > 0) {
              onSelectCategory(categories[0].id);
            }
          } else if (currentIndex < categories.length - 1) {
            onSelectCategory(categories[currentIndex + 1].id);
          } else {
            // Wrap to "All"
            onSelectCategory(null);
          }
        }
        return;
      }
    },
    [
      enabled,
      selectedItemId,
      categories,
      selectedCategoryId,
      onAssignCategory,
      onClearCategories,
      onCreateCategory,
      onSelectCategory,
      onDuplicateItem,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
