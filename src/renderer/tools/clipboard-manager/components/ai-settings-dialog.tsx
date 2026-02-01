/**
 * AISettingsDialog - Configure AI API settings
 */

import { useState, useEffect, FormEvent, useCallback } from 'react';

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface AISettingsDialogProps {
  isOpen: boolean;
  settings: AISettings | null;
  onSave: (settings: AISettings) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'openai/gpt-5.2-chat';

export function AISettingsDialog({
  isOpen,
  settings,
  onSave,
  onClose,
}: AISettingsDialogProps): JSX.Element | null {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && settings) {
      setApiKey(settings.apiKey || '');
      setBaseUrl(settings.baseUrl || DEFAULT_BASE_URL);
      setModel(settings.model || DEFAULT_MODEL);
    } else if (isOpen) {
      setApiKey('');
      setBaseUrl(DEFAULT_BASE_URL);
      setModel(DEFAULT_MODEL);
    }
    setShowApiKey(false);
  }, [isOpen, settings]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
        model: model.trim() || DEFAULT_MODEL,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, baseUrl, model, isSaving, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-content ai-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog-header">
          <h3>AI Settings</h3>
          <button className="dialog-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="form-group">
              <label htmlFor="ai-api-key">API Key</label>
              <div className="api-key-input-wrapper">
                <input
                  id="ai-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="form-hint">
                Your API key is stored encrypted locally.
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ai-base-url">Base URL</label>
              <input
                id="ai-base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={DEFAULT_BASE_URL}
              />
              <div className="form-hint">
                OpenAI-compatible API endpoint. Leave default for OpenAI.
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ai-model">Model</label>
              <input
                id="ai-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={DEFAULT_MODEL}
              />
              <div className="form-hint">
                Model name (e.g., gpt-4o-mini, gpt-4o, claude-3-5-sonnet)
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
