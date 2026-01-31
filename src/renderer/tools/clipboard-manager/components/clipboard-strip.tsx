/**
 * ClipboardStrip - Bottom scrollable strip of clipboard items
 */

import { useRef, useEffect, useCallback, DragEvent, MouseEvent } from 'react';
import { ClipboardItem } from './clipboard-item';
import type { ClipboardItem as ClipboardItemType, Category } from '../types';

interface ClipboardStripProps {
  items: ClipboardItemType[];
  loading: boolean;
  hasMore: boolean;
  selectedId: string | null;
  categories?: Category[];
  draggedItemId?: string | null;
  onSelectItem: (id: string) => void;
  onPasteItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onLoadMore: () => void;
  onDragStart?: (e: DragEvent, itemId: string) => void;
  onDragEnd?: () => void;
  onContextMenu?: (e: MouseEvent, itemId: string) => void;
}

export function ClipboardStrip({
  items,
  loading,
  hasMore,
  selectedId,
  categories = [],
  draggedItemId,
  onSelectItem,
  onPasteItem,
  onDeleteItem,
  onLoadMore,
  onDragStart,
  onDragEnd,
  onContextMenu,
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
            isDragging={item.id === draggedItemId}
            categories={categories}
            onSelect={() => onSelectItem(item.id)}
            onPaste={() => onPasteItem(item.id)}
            onDelete={() => onDeleteItem(item.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onContextMenu={onContextMenu}
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
