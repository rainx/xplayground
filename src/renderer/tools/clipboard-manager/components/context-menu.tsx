/**
 * ContextMenu - Right-click context menu for clipboard items
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Category, ClipboardItem } from '../types';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  item: ClipboardItem;
  categories: Category[];
  onPaste: (itemId: string) => void;
  onPasteAsPlainText: (itemId: string) => void;
  onCopy: (itemId: string) => void;
  onOpen: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onAIModify: (itemId: string) => void;
  onAssignCategory: (itemId: string, categoryId: string) => void;
  onRemoveCategory: (itemId: string, categoryId: string) => void;
  onDuplicate: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onPin: (itemId: string) => void;
  onPreview: (itemId: string) => void;
  onClose: () => void;
}

export function ContextMenu({
  isOpen,
  position,
  item,
  categories,
  onPaste,
  onPasteAsPlainText,
  onCopy,
  onOpen,
  onEdit,
  onAIModify,
  onAssignCategory,
  onRemoveCategory,
  onDuplicate,
  onDelete,
  onPin,
  onPreview,
  onClose,
}: ContextMenuProps): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleAction = useCallback(
    (action: (id: string) => void) => {
      action(item.id);
      onClose();
    },
    [item.id, onClose]
  );

  if (!isOpen) return null;

  const itemCategoryIds = item.pinboardIds || [];
  const unassignedCategories = categories.filter((c) => !itemCategoryIds.includes(c.id));
  const assignedCategories = categories.filter((c) => itemCategoryIds.includes(c.id));

  // Determine if item can be opened (links, files)
  const canOpen = item.type === 'link' || item.type === 'file';
  const isPinned = item.isPinned;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Primary Actions */}
      {canOpen && (
        <button
          className="context-menu-item"
          onClick={() => handleAction(onOpen)}
        >
          <span className="context-menu-icon-left">⌘O</span>
          Open
        </button>
      )}

      <button
        className="context-menu-item"
        onClick={() => handleAction(onPaste)}
      >
        <span className="context-menu-icon-left">↩</span>
        Paste
      </button>

      {(item.type === 'text' || item.type === 'rich_text' || item.type === 'link') && (
        <button
          className="context-menu-item"
          onClick={() => handleAction(onPasteAsPlainText)}
        >
          <span className="context-menu-icon-left">⌥↩</span>
          Paste as Plain Text
        </button>
      )}

      <button
        className="context-menu-item"
        onClick={() => handleAction(onCopy)}
      >
        <span className="context-menu-icon-left">⌘C</span>
        Copy
      </button>

      {/* Edit Actions for text types */}
      {(item.type === 'text' || item.type === 'rich_text' || item.type === 'color') && (
        <>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={() => handleAction(onEdit)}
          >
            <span className="context-menu-icon-left">✏️</span>
            Edit
          </button>
          <button
            className="context-menu-item"
            onClick={() => handleAction(onAIModify)}
          >
            <span className="context-menu-icon-left">🤖</span>
            AI Modify
          </button>
        </>
      )}

      <div className="context-menu-divider" />

      {/* Category Section */}
      {unassignedCategories.length > 0 && (
        <div className="context-menu-section">
          <div className="context-menu-label">Assign to Category</div>
          {unassignedCategories.map((category) => (
            <button
              key={category.id}
              className="context-menu-item"
              onClick={() => {
                onAssignCategory(item.id, category.id);
                onClose();
              }}
            >
              <span
                className="context-menu-color"
                style={{ backgroundColor: category.color }}
              />
              {category.icon && <span className="context-menu-icon">{category.icon}</span>}
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      )}

      {assignedCategories.length > 0 && (
        <div className="context-menu-section">
          <div className="context-menu-label">Remove from Category</div>
          {assignedCategories.map((category) => (
            <button
              key={category.id}
              className="context-menu-item"
              onClick={() => {
                onRemoveCategory(item.id, category.id);
                onClose();
              }}
            >
              <span
                className="context-menu-color"
                style={{ backgroundColor: category.color }}
              />
              {category.icon && <span className="context-menu-icon">{category.icon}</span>}
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="context-menu-divider" />

      {/* Secondary Actions */}
      <button
        className="context-menu-item"
        onClick={() => handleAction(onDuplicate)}
      >
        <span className="context-menu-icon-left">⌘D</span>
        Duplicate
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(onPin)}
      >
        <span className="context-menu-icon-left">📌</span>
        {isPinned ? 'Unpin' : 'Pin'}
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(onPreview)}
      >
        <span className="context-menu-icon-left">Space</span>
        Preview
      </button>

      <div className="context-menu-divider" />

      {/* Danger Zone */}
      <button
        className="context-menu-item danger"
        onClick={() => handleAction(onDelete)}
      >
        <span className="context-menu-icon-left">⌫</span>
        Delete
      </button>
    </div>
  );
}
