/**
 * ClipboardStrip - Bottom scrollable strip of clipboard items
 */

import { useRef, useEffect, useCallback } from 'react';
import { ClipboardItem } from './clipboard-item';
import type { ClipboardItem as ClipboardItemType } from '../types';

interface ClipboardStripProps {
  items: ClipboardItemType[];
  loading: boolean;
  hasMore: boolean;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onPasteItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onLoadMore: () => void;
}

export function ClipboardStrip({
  items,
  loading,
  hasMore,
  selectedId,
  onSelectItem,
  onPasteItem,
  onDeleteItem,
  onLoadMore,
}: ClipboardStripProps): JSX.Element {
  const stripRef = useRef<HTMLDivElement>(null);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || loading || !hasMore) return;

    // Check if scrolled near the end (right side)
    const scrollRight = strip.scrollWidth - strip.scrollLeft - strip.clientWidth;
    if (scrollRight < 200) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    strip.addEventListener('scroll', handleScroll);
    return () => strip.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!items.length) return;

      const currentIndex = selectedId
        ? items.findIndex((item) => item.id === selectedId)
        : -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, items.length - 1);
        onSelectItem(items[nextIndex].id);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        onSelectItem(items[prevIndex].id);
      }
    },
    [items, selectedId, onSelectItem]
  );

  if (items.length === 0 && !loading) {
    return (
      <div className="clipboard-strip empty">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No clipboard history yet</p>
          <p className="empty-hint">Copy something to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="clipboard-strip"
      ref={stripRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="strip-content">
        {items.map((item) => (
          <ClipboardItem
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            onSelect={() => onSelectItem(item.id)}
            onPaste={() => onPasteItem(item.id)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
        {loading && (
          <div className="loading-indicator">
            <span>Loading...</span>
          </div>
        )}
        {hasMore && !loading && (
          <div className="load-more">
            <button onClick={onLoadMore}>Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
