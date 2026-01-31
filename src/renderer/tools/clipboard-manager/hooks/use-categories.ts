/**
 * Hook for managing clipboard categories
 */

import { useState, useEffect, useCallback } from 'react';
import type { Category, CategoryCreateInput, CategoryUpdateInput } from '../types';

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: Error | null;
  createCategory: (input: CategoryCreateInput) => Promise<Category | null>;
  updateCategory: (id: string, updates: CategoryUpdateInput) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  assignItemToCategory: (itemId: string, categoryId: string) => Promise<boolean>;
  removeItemFromCategory: (itemId: string, categoryId: string) => Promise<boolean>;
  clearItemCategories: (itemId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.clipboard.categories.getAll();
      setCategories(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Subscribe to category events
  useEffect(() => {
    const unsubscribeCreated = window.api.clipboard.categories.onCreated((category: Category) => {
      setCategories((prev) => [...prev, category].sort((a, b) => a.order - b.order));
    });

    const unsubscribeUpdated = window.api.clipboard.categories.onUpdated((category: Category) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? category : c)).sort((a, b) => a.order - b.order)
      );
    });

    const unsubscribeDeleted = window.api.clipboard.categories.onDeleted((id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, []);

  const createCategory = useCallback(async (input: CategoryCreateInput): Promise<Category | null> => {
    try {
      const category = await window.api.clipboard.categories.create(input);
      return category;
    } catch (err) {
      console.error('Failed to create category:', err);
      return null;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: CategoryUpdateInput): Promise<Category | null> => {
    try {
      const category = await window.api.clipboard.categories.update(id, updates);
      return category;
    } catch (err) {
      console.error('Failed to update category:', err);
      return null;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.api.clipboard.categories.delete(id);
      return result.success;
    } catch (err) {
      console.error('Failed to delete category:', err);
      return false;
    }
  }, []);

  const reorderCategories = useCallback(async (orderedIds: string[]): Promise<void> => {
    try {
      await window.api.clipboard.categories.reorder(orderedIds);
      // Update local state immediately for responsiveness
      setCategories((prev) => {
        const reordered: Category[] = [];
        for (let i = 0; i < orderedIds.length; i++) {
          const cat = prev.find((c) => c.id === orderedIds[i]);
          if (cat) {
            reordered.push({ ...cat, order: i });
          }
        }
        return reordered;
      });
    } catch (err) {
      console.error('Failed to reorder categories:', err);
    }
  }, []);

  const assignItemToCategory = useCallback(async (itemId: string, categoryId: string): Promise<boolean> => {
    try {
      const result = await window.api.clipboard.categories.assignItem(itemId, categoryId);
      return result.success;
    } catch (err) {
      console.error('Failed to assign item to category:', err);
      return false;
    }
  }, []);

  const removeItemFromCategory = useCallback(async (itemId: string, categoryId: string): Promise<boolean> => {
    try {
      const result = await window.api.clipboard.categories.removeItem(itemId, categoryId);
      return result.success;
    } catch (err) {
      console.error('Failed to remove item from category:', err);
      return false;
    }
  }, []);

  const clearItemCategories = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      const result = await window.api.clipboard.categories.clearItemCategories(itemId);
      return result.success;
    } catch (err) {
      console.error('Failed to clear item categories:', err);
      return false;
    }
  }, []);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    assignItemToCategory,
    removeItemFromCategory,
    clearItemCategories,
    refresh: loadCategories,
  };
}
