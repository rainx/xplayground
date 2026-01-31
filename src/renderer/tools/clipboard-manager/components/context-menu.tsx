/**
 * ContextMenu - Right-click context menu for clipboard items
 */

import { useEffect, useRef } from 'react';
import type { Category } from '../types';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  itemId: string;
  itemCategoryIds: string[];
  categories: Category[];
  onAssignCategory: (itemId: string, categoryId: string) => void;
  onRemoveCategory: (itemId: string, categoryId: string) => void;
  onDuplicate: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onClose: () => void;
}

export function ContextMenu({
  isOpen,
  position,
  itemId,
  itemCategoryIds,
  categories,
  onAssignCategory,
  onRemoveCategory,
  onDuplicate,
  onDelete,
  onClose,
}: ContextMenuProps): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  const unassignedCategories = categories.filter((c) => !itemCategoryIds.includes(c.id));
  const assignedCategories = categories.filter((c) => itemCategoryIds.includes(c.id));

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {unassignedCategories.length > 0 && (
        <div className="context-menu-section">
          <div className="context-menu-label">Assign to Category</div>
          {unassignedCategories.map((category) => (
            <button
              key={category.id}
              className="context-menu-item"
              onClick={() => {
                onAssignCategory(itemId, category.id);
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
                onRemoveCategory(itemId, category.id);
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

      <button
        className="context-menu-item"
        onClick={() => {
          onDuplicate(itemId);
          onClose();
        }}
      >
        <span className="context-menu-shortcut">⌘D</span>
        Duplicate
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item danger"
        onClick={() => {
          onDelete(itemId);
          onClose();
        }}
      >
        Delete
      </button>
    </div>
  );
}
