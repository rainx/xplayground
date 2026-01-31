/**
 * CategoryDialog - Create/Edit category modal
 */

import { useState, useEffect, FormEvent } from 'react';
import type { Category, CategoryCreateInput, CategoryUpdateInput } from '../types';

const PRESET_COLORS = [
  '#4285f4', // Blue
  '#ea4335', // Red
  '#fbbc04', // Yellow
  '#34a853', // Green
  '#ff6d01', // Orange
  '#46bdc6', // Teal
  '#7b1fa2', // Purple
  '#c2185b', // Pink
];

const PRESET_ICONS = ['', '📁', '💼', '🏠', '⭐', '❤️', '📌', '🔖', '📝', '🎯'];

interface CategoryDialogProps {
  isOpen: boolean;
  category?: Category;
  onSave: (data: CategoryCreateInput | CategoryUpdateInput) => void;
  onClose: () => void;
}

export function CategoryDialog({
  isOpen,
  category,
  onSave,
  onClose,
}: CategoryDialogProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('');

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon || '');
    } else {
      setName('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setIcon('');
    }
  }, [category, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      color,
      icon: icon || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{isEditing ? 'Edit Category' : 'New Category'}</h3>
          <button className="dialog-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="form-group">
              <label htmlFor="category-name">Name</label>
              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-option ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Icon (optional)</label>
              <div className="icon-picker">
                {PRESET_ICONS.map((i, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`icon-option ${icon === i ? 'selected' : ''}`}
                    onClick={() => setIcon(i)}
                  >
                    {i || '—'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
