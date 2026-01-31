/**
 * Hook for managing clipboard history
 */

import { useState, useEffect, useCallback } from 'react';
import type { ClipboardItem } from '../types';

interface UseClipboardHistoryResult {
  items: ClipboardItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  pasteItem: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearAll: () => Promise<void>;
  clearCategoryItems: (categoryId: string) => Promise<void>;
}

const LIMIT = 50;

export function useClipboardHistory(): UseClipboardHistoryResult {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadItems = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const result = await window.api.clipboard.getHistory({
        limit: LIMIT,
        offset: currentOffset,
      });

      setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
      setHasMore(result.hasMore);
      setOffset(currentOffset + result.items.length);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load clipboard history'));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  // Initial load
  useEffect(() => {
    loadItems(true);
  }, []);

  // Subscribe to new items
  useEffect(() => {
    const unsubscribe = window.api.clipboard.onItemAdded((item: ClipboardItem) => {
      setItems((prev) => [item, ...prev]);
    });

    return unsubscribe;
  }, []);

  // Subscribe to deleted items
  useEffect(() => {
    const unsubscribe = window.api.clipboard.onItemDeleted((id: string) => {
      setItems((prev) => {
        const newItems = prev.filter((item) => item.id !== id);
        if (newItems.length < prev.length) {
          setOffset((prevOffset) => Math.max(0, prevOffset - 1));
        }
        return newItems;
      });
    });

    return unsubscribe;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    // Just call the API - the onItemDeleted subscription will handle state updates
    await window.api.clipboard.deleteItem(id);
  }, []);

  const pasteItem = useCallback(async (id: string) => {
    await window.api.clipboard.pasteItem(id);
  }, []);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadItems(false);
    }
  }, [loading, hasMore, loadItems]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await loadItems(true);
  }, [loadItems]);

  const clearAll = useCallback(async () => {
    await window.api.clipboard.clearHistory();
    // State updates will happen via onItemDeleted subscriptions
  }, []);

  const clearCategoryItems = useCallback(async (categoryId: string) => {
    await window.api.clipboard.clearCategoryItems(categoryId);
    // State updates will happen via onItemDeleted subscriptions
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    deleteItem,
    pasteItem,
    refresh,
    clearAll,
    clearCategoryItems,
  };
}
