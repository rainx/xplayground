/**
 * ClipboardItem - Individual clipboard item card
 */

import { useCallback, DragEvent, MouseEvent } from 'react';
import type { ClipboardItem as ClipboardItemType, Category } from '../types';
import { CategoryBadges } from './category-badge';
import { ImagePreview } from './image-preview';

interface ClipboardItemProps {
  item: ClipboardItemType;
  isSelected: boolean;
  isDragging?: boolean;
  categories?: Category[];
  onSelect: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDragStart?: (e: DragEvent, itemId: string) => void;
  onDragEnd?: () => void;
  onContextMenu?: (e: MouseEvent, itemId: string) => void;
}

export function ClipboardItem({
  item,
  isSelected,
  isDragging = false,
  categories = [],
  onSelect,
  onPaste,
  onDelete,
  onDragStart,
  onDragEnd,
  onContextMenu,
}: ClipboardItemProps): JSX.Element {
  const handleDoubleClick = useCallback(() => {
    onPaste();
  }, [onPaste]);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      onDragStart?.(e, item.id);
    },
    [item.id, onDragStart]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onContextMenu?.(e, item.id);
    },
    [item.id, onContextMenu]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onPaste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete();
      }
    },
    [onPaste, onDelete]
  );

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderPreview = (): JSX.Element => {
    switch (item.type) {
      case 'text':
      case 'rich_text':
        return (
          <div className="preview-text">
            {item.textContent?.plainText.substring(0, 150) || 'Empty text'}
            {(item.textContent?.plainText.length || 0) > 150 && '...'}
          </div>
        );

      case 'image':
        return (
          <div className="preview-image">
            {item.imageContent?.thumbnailPath ? (
              <ImagePreview
                imagePath={item.imageContent.thumbnailPath}
                alt="Clipboard image"
                fallback={
                  <div className="image-placeholder">
                    🖼️ {item.imageContent?.width}×{item.imageContent?.height}
                  </div>
                }
              />
            ) : (
              <div className="image-placeholder">
                🖼️ {item.imageContent?.width}×{item.imageContent?.height}
              </div>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="preview-link">
            <span className="link-icon">🔗</span>
            <div className="link-info">
              <div className="link-title">
                {item.linkContent?.title || item.linkContent?.url}
              </div>
              <div className="link-domain">{item.linkContent?.domain}</div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="preview-files">
            {item.fileContent?.files.slice(0, 3).map((file, i) => (
              <div key={i} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
              </div>
            ))}
            {(item.fileContent?.files.length || 0) > 3 && (
              <div className="more-files">
                +{(item.fileContent?.files.length || 0) - 3} more
              </div>
            )}
          </div>
        );

      default:
        return <div className="preview-unknown">Unknown content</div>;
    }
  };

  const getTypeIcon = (): string => {
    switch (item.type) {
      case 'text':
        return 'Aa';
      case 'rich_text':
        return 'Aa';
      case 'image':
        return '🖼️';
      case 'link':
        return '🔗';
      case 'file':
        return '📁';
      case 'color':
        return '🎨';
      default:
        return '📋';
    }
  };

  return (
    <div
      className={`clipboard-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} type-${item.type}`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      tabIndex={0}
      role="button"
      aria-label={`Clipboard item: ${item.type}`}
    >
      <div className="item-header">
        <span className="item-type-icon">{getTypeIcon()}</span>
        <span className="item-time">{formatTime(item.createdAt)}</span>
        {item.sourceApp && (
          <span className="item-source" title={item.sourceApp.bundleId}>
            {item.sourceApp.name}
          </span>
        )}
        {item.pinboardIds && item.pinboardIds.length > 0 && (
          <CategoryBadges
            categories={categories}
            categoryIds={item.pinboardIds}
            maxVisible={2}
          />
        )}
      </div>
      <div className="item-content">{renderPreview()}</div>
      <div className="item-actions">
        <button
          className="action-btn paste-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPaste();
          }}
          title="Paste (Enter)"
        >
          Paste
        </button>
        <button
          className="action-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
