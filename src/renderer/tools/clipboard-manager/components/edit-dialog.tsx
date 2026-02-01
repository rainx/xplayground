/**
 * EditDialog - Edit text content of clipboard item
 */

import { useState, useEffect, FormEvent, useCallback } from 'react';
import type { ClipboardItem } from '../types';

interface EditDialogProps {
  isOpen: boolean;
  item: ClipboardItem | null;
  onSave: (itemId: string, newText: string) => Promise<void>;
  onClose: () => void;
}

export function EditDialog({
  isOpen,
  item,
  onSave,
  onClose,
}: EditDialogProps): JSX.Element | null {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && isOpen) {
      setText(item.textContent?.plainText || '');
    }
  }, [item, isOpen]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!item || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(item.id, text);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [item, text, isSaving, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }, [onClose, handleSubmit]);

  if (!isOpen || !item) return null;

  const charCount = text.length;
  const lineCount = text.split('\n').length;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-content edit-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog-header">
          <h3>Edit Content</h3>
          <button className="dialog-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="form-group">
              <label htmlFor="edit-text">Content</label>
              <textarea
                id="edit-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text content..."
                autoFocus
                rows={10}
                className="edit-textarea"
              />
              <div className="edit-stats">
                {charCount} characters | {lineCount} lines
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
