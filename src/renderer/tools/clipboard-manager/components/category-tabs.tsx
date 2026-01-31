/**
 * CategoryTabs - Horizontal category filter tabs
 */

import { DragEvent } from 'react';
import type { Category } from '../types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: () => void;
  dropTargetId: string | null;
  onDragOver: (e: DragEvent, targetId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, targetId: string) => void;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  dropTargetId,
  onDragOver,
  onDragLeave,
  onDrop,
}: CategoryTabsProps): JSX.Element {
  return (
    <div className="category-tabs">
      <button
        className={`category-tab ${selectedCategoryId === null ? 'active' : ''}`}
        onClick={() => onSelectCategory(null)}
      >
        All
      </button>

      {categories.map((category, index) => (
        <button
          key={category.id}
          className={`category-tab ${selectedCategoryId === category.id ? 'active' : ''} ${
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
          {category.icon && <span className="category-icon">{category.icon}</span>}
          <span className="category-name">{category.name}</span>
          <span className="category-shortcut">{index < 9 ? `${index + 1}` : ''}</span>
        </button>
      ))}

      <button
        className="category-tab add-category"
        onClick={onAddCategory}
        title="Add Category (Cmd+N)"
      >
        +
      </button>
    </div>
  );
}
