/**
 * CategorySidebar - Expandable sidebar for category management
 */

import { DragEvent } from 'react';
import type { Category } from '../types';

interface CategorySidebarProps {
  isOpen: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onClose: () => void;
  dropTargetId: string | null;
  onDragOver: (e: DragEvent, targetId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, targetId: string) => void;
}

export function CategorySidebar({
  isOpen,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
  onClose,
  dropTargetId,
  onDragOver,
  onDragLeave,
  onDrop,
}: CategorySidebarProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="category-sidebar">
      <div className="sidebar-header">
        <h3>Categories</h3>
        <button className="sidebar-close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="sidebar-content">
        <div
          className={`sidebar-item ${selectedCategoryId === null ? 'active' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <span className="sidebar-item-name">All Items</span>
        </div>

        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`sidebar-item ${selectedCategoryId === category.id ? 'active' : ''} ${
              dropTargetId === category.id ? 'drop-target' : ''
            }`}
            style={{
              '--category-color': category.color,
            } as React.CSSProperties}
            onClick={() => onSelectCategory(category.id)}
            onDragOver={(e) => onDragOver(e, category.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, category.id)}
          >
            <div className="sidebar-item-color" style={{ backgroundColor: category.color }} />
            {category.icon && <span className="sidebar-item-icon">{category.icon}</span>}
            <span className="sidebar-item-name">{category.name}</span>
            <span className="sidebar-item-shortcut">
              {index < 9 ? `⌘${index + 1}` : ''}
            </span>
            <div className="sidebar-item-actions">
              <button
                className="sidebar-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCategory(category);
                }}
                title="Edit"
              >
                ✎
              </button>
              <button
                className="sidebar-action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.id);
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
