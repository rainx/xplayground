/**
 * AIPromptDialog - Enter instruction for AI text modification
 */

import { useState, useEffect, FormEvent, useCallback } from 'react';
import type { ClipboardItem } from '../types';

interface AIPromptDialogProps {
  isOpen: boolean;
  item: ClipboardItem | null;
  onSubmit: (itemId: string, instruction: string) => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
  error: string | null;
}

const QUICK_ACTIONS = [
  { label: 'Fix grammar', instruction: 'Fix any grammar and spelling errors' },
  { label: 'Make formal', instruction: 'Rewrite in a formal, professional tone' },
  { label: 'Make casual', instruction: 'Rewrite in a casual, friendly tone' },
  { label: 'Summarize', instruction: 'Summarize the key points concisely' },
  { label: 'Expand', instruction: 'Expand with more detail and context' },
  { label: 'Simplify', instruction: 'Simplify for easier understanding' },
];

export function AIPromptDialog({
  isOpen,
  item,
  onSubmit,
  onClose,
  isProcessing,
  error,
}: AIPromptDialogProps): JSX.Element | null {
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInstruction('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!item || !instruction.trim() || isProcessing) return;
    await onSubmit(item.id, instruction.trim());
  }, [item, instruction, isProcessing, onSubmit]);

  const handleQuickAction = useCallback((actionInstruction: string) => {
    setInstruction(actionInstruction);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) {
      onClose();
    }
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && instruction.trim()) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }, [onClose, isProcessing, instruction, handleSubmit]);

  if (!isOpen || !item) return null;

  const originalText = item.textContent?.plainText || '';
  const previewText = originalText.length > 200
    ? originalText.substring(0, 200) + '...'
    : originalText;

  return (
    <div className="dialog-overlay" onClick={isProcessing ? undefined : onClose}>
      <div
        className="dialog-content ai-prompt-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog-header">
          <h3>AI Modify</h3>
          <button className="dialog-close" onClick={onClose} disabled={isProcessing}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="form-group">
              <label>Original Text</label>
              <div className="ai-original-text">
                {previewText}
              </div>
            </div>

            <div className="form-group">
              <label>Quick Actions</label>
              <div className="ai-quick-actions">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="quick-action-btn"
                    onClick={() => handleQuickAction(action.instruction)}
                    disabled={isProcessing}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ai-instruction">Instruction</label>
              <textarea
                id="ai-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe how you want the text to be modified..."
                rows={3}
                autoFocus
                disabled={isProcessing}
                className="ai-instruction-textarea"
              />
            </div>

            {error && (
              <div className="ai-error">
                {error}
              </div>
            )}

            {isProcessing && (
              <div className="ai-processing">
                <span className="ai-spinner"></span>
                Processing with AI...
              </div>
            )}
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!instruction.trim() || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
