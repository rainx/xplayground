/**
 * ClipboardItem - Individual clipboard item card
 */

import { useCallback } from 'react';
import type { ClipboardItem as ClipboardItemType } from '../types';

interface ClipboardItemProps {
  item: ClipboardItemType;
  isSelected: boolean;
  onSelect: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

export function ClipboardItem({
  item,
  isSelected,
  onSelect,
  onPaste,
  onDelete,
}: ClipboardItemProps): JSX.Element {
  const handleDoubleClick = useCallback(() => {
    onPaste();
  }, [onPaste]);

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
              <img
                src={`file://${item.imageContent.thumbnailPath}`}
                alt="Clipboard image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
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
      className={`clipboard-item ${isSelected ? 'selected' : ''} type-${item.type}`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
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
