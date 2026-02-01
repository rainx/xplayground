/**
 * KeyboardShortcutsDialog - Edit global keyboard shortcuts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import './keyboard-shortcuts-dialog.css';

interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  defaultShortcut: string;
  category: string;
}

interface ShortcutBinding {
  action: string;
  shortcut: string;
  enabled: boolean;
  lastError?: string;
}

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps): JSX.Element | null {
  const [definitions, setDefinitions] = useState<ShortcutDefinition[]>([]);
  const [bindings, setBindings] = useState<ShortcutBinding[]>([]);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadShortcuts();
    }
  }, [isOpen]);

  const loadShortcuts = async () => {
    try {
      const result = await window.api.shortcuts.getAll();
      setDefinitions(result.definitions);
      setBindings(result.bindings);
    } catch (err) {
      console.error('Failed to load shortcuts:', err);
    }
  };

  const getBinding = (actionId: string): ShortcutBinding | undefined => {
    return bindings.find((b) => b.action === actionId);
  };

  const startRecording = (actionId: string) => {
    setEditingAction(actionId);
    setRecordedKeys('');
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editingAction) return;
      e.preventDefault();
      e.stopPropagation();

      // Build shortcut string
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Control');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Command');

      // Get the main key
      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        // Handle Escape to cancel
        if (key === 'Escape' && parts.length === 0) {
          cancelRecording();
          return;
        }

        // Normalize key names
        let normalizedKey = key.length === 1 ? key.toUpperCase() : key;
        // Map special keys
        if (normalizedKey === ' ') normalizedKey = 'Space';
        if (normalizedKey === 'ArrowUp') normalizedKey = 'Up';
        if (normalizedKey === 'ArrowDown') normalizedKey = 'Down';
        if (normalizedKey === 'ArrowLeft') normalizedKey = 'Left';
        if (normalizedKey === 'ArrowRight') normalizedKey = 'Right';

        parts.push(normalizedKey);
      }

      // Only set if we have at least one modifier and one key
      if (parts.length >= 2) {
        setRecordedKeys(parts.join('+'));
      }
    },
    [editingAction]
  );

  const saveShortcut = async () => {
    if (!editingAction || !recordedKeys) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await window.api.shortcuts.updateBinding(editingAction, recordedKeys);

      if (result.success) {
        await loadShortcuts();
        setEditingAction(null);
        setRecordedKeys('');
      } else {
        setError(result.error || 'Failed to save shortcut');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelRecording = () => {
    setEditingAction(null);
    setRecordedKeys('');
    setError(null);
  };

  const resetToDefault = async (actionId: string) => {
    try {
      const result = await window.api.shortcuts.resetToDefault(actionId);
      if (result.success) {
        await loadShortcuts();
      }
    } catch (err) {
      console.error('Failed to reset shortcut:', err);
    }
  };

  const clearShortcut = async (actionId: string) => {
    try {
      const result = await window.api.shortcuts.updateBinding(actionId, '');
      if (result.success) {
        await loadShortcuts();
      }
    } catch (err) {
      console.error('Failed to clear shortcut:', err);
    }
  };

  const handleKeyDownDialog = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !editingAction) {
        onClose();
      }
    },
    [onClose, editingAction]
  );

  if (!isOpen) return null;

  // Group by category
  const categories = [...new Set(definitions.map((d) => d.category))];

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'clipboard':
        return 'Clipboard Manager';
      case 'snap':
        return 'Snap Screenshot';
      default:
        return category;
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-content keyboard-shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownDialog}
      >
        <div className="dialog-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="dialog-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="dialog-body">
          {categories.map((category) => (
            <div key={category} className="shortcut-category">
              <h4 className="category-title">{getCategoryLabel(category)}</h4>
              <div className="shortcut-list">
                {definitions
                  .filter((def) => def.category === category)
                  .map((def) => {
                    const binding = getBinding(def.id);
                    const isEditing = editingAction === def.id;

                    return (
                      <div key={def.id} className="shortcut-item">
                        <div className="shortcut-info">
                          <span className="shortcut-label">{def.label}</span>
                          <span className="shortcut-description">{def.description}</span>
                        </div>
                        <div className="shortcut-control">
                          {isEditing ? (
                            <div className="shortcut-recording">
                              <input
                                ref={inputRef}
                                type="text"
                                className="shortcut-input recording"
                                value={recordedKeys || 'Press keys...'}
                                onKeyDown={handleKeyDown}
                                readOnly
                                placeholder="Press keys..."
                              />
                              <button
                                className="btn-small btn-primary"
                                onClick={saveShortcut}
                                disabled={!recordedKeys || isSaving}
                              >
                                {isSaving ? '...' : 'Save'}
                              </button>
                              <button className="btn-small btn-secondary" onClick={cancelRecording}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="shortcut-display">
                              <kbd
                                className={`shortcut-key ${!binding?.shortcut ? 'empty' : ''}`}
                                onClick={() => startRecording(def.id)}
                              >
                                {binding?.shortcut || 'Not set'}
                              </kbd>
                              {binding?.shortcut && binding.shortcut !== def.defaultShortcut && (
                                <button
                                  className="btn-icon"
                                  onClick={() => resetToDefault(def.id)}
                                  title="Reset to default"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                  </svg>
                                </button>
                              )}
                              {binding?.shortcut && (
                                <button
                                  className="btn-icon"
                                  onClick={() => clearShortcut(def.id)}
                                  title="Clear shortcut"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {binding?.lastError && (
                          <div className="shortcut-error">{binding.lastError}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          {error && <div className="global-error">{error}</div>}
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
