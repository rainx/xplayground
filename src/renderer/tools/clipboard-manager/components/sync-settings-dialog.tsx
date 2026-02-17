/**
 * SyncSettingsDialog - Login/logout, sync toggle, status display
 * When not authenticated, shows a 3-step setup wizard to guide
 * Google Cloud OAuth configuration.
 */

import { useState, useEffect } from 'react';
import type { SyncState } from '../types';

interface SyncSettingsDialogProps {
  isOpen: boolean;
  syncState: SyncState;
  loading: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onToggleSync: (enabled: boolean) => Promise<void>;
  onSyncNow: () => Promise<void>;
  onSetOAuthClient: (clientId: string, clientSecret: string) => Promise<void>;
  onClose: () => void;
}

const TOTAL_STEPS = 3;

export function SyncSettingsDialog({
  isOpen,
  syncState,
  loading,
  onLogin,
  onLogout,
  onToggleSync,
  onSyncNow,
  onSetOAuthClient,
  onClose,
}: SyncSettingsDialogProps): JSX.Element | null {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showCredentials, setShowCredentials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (syncState.error) {
      setError(syncState.error);
    }
  }, [syncState.error]);

  // Reset step when authentication state changes
  useEffect(() => {
    if (!syncState.isAuthenticated) {
      setStep(1);
    }
  }, [syncState.isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setError(null);
    try {
      if (clientId.trim() && clientSecret.trim()) {
        await onSetOAuthClient(clientId.trim(), clientSecret.trim());
      }
      await onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await onLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank');
  };

  const stepTitles = [
    'Create Google Cloud Project',
    'Configure OAuth Consent',
    'Enter Credentials',
  ];

  const renderStepIndicator = () => (
    <div className="setup-steps">
      {stepTitles.map((title, i) => {
        const stepNum = i + 1;
        const isActive = step === stepNum;
        const isCompleted = step > stepNum;
        return (
          <div key={stepNum} className="setup-step-wrapper">
            {i > 0 && (
              <div
                className={`setup-step-connector ${isCompleted || isActive ? 'active' : ''}`}
              />
            )}
            <button
              className={`setup-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setStep(stepNum)}
              type="button"
            >
              <span className="setup-step-number">
                {isCompleted ? '✓' : stepNum}
              </span>
              <span className="setup-step-label">{title}</span>
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="setup-content">
            <p className="setup-description">
              Create a Google Cloud project and enable the Drive API to allow clipboard sync.
            </p>
            <ol className="setup-instructions">
              <li>Open Google Cloud Console and create a new project</li>
              <li>Go to <strong>APIs &amp; Services &gt; Library</strong></li>
              <li>Search for <strong>Google Drive API</strong> and enable it</li>
            </ol>
            <button
              className="setup-link"
              onClick={() => openExternal('https://console.cloud.google.com/projectcreate')}
              type="button"
            >
              Open Google Cloud Console ↗
            </button>
          </div>
        );
      case 2:
        return (
          <div className="setup-content">
            <p className="setup-description">
              Configure the OAuth consent screen so you can authorize xToolbox to access your Drive.
            </p>
            <ol className="setup-instructions">
              <li>Go to <strong>APIs &amp; Services &gt; OAuth consent screen</strong></li>
              <li>Select <strong>External</strong> user type</li>
              <li>Fill in the required app information</li>
              <li>
                Add scope: <code>https://www.googleapis.com/auth/drive.appdata</code>
              </li>
              <li>Add your Google account as a <strong>Test user</strong></li>
            </ol>
            <button
              className="setup-link"
              onClick={() => openExternal('https://console.cloud.google.com/apis/credentials/consent')}
              type="button"
            >
              Open OAuth Consent Screen ↗
            </button>
          </div>
        );
      case 3:
        return (
          <div className="setup-content">
            <p className="setup-description">
              Create a Desktop OAuth client and enter the credentials below.
            </p>
            <ol className="setup-instructions">
              <li>Go to <strong>APIs &amp; Services &gt; Credentials</strong></li>
              <li>Click <strong>Create Credentials &gt; OAuth client ID</strong></li>
              <li>Select application type: <strong>Desktop app</strong></li>
              <li>Copy the Client ID and Client Secret below</li>
            </ol>
            <button
              className="setup-link"
              onClick={() => openExternal('https://console.cloud.google.com/apis/credentials')}
              type="button"
              style={{ marginBottom: 16 }}
            >
              Open Credentials Page ↗
            </button>

            <div className="form-group">
              <label>Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </div>

            <div className="form-group">
              <label>Client Secret</label>
              <div className="api-key-input-wrapper">
                <input
                  type={showCredentials ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                />
                <button
                  className="toggle-visibility-btn"
                  onClick={() => setShowCredentials(!showCredentials)}
                  type="button"
                >
                  {showCredentials ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-content sync-settings-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h3>Cloud Sync</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-body">
          {/* Status Display */}
          <div className="sync-status-section">
            <div className="sync-status-row">
              <span className="sync-status-label">Status</span>
              <span className={`sync-status-value ${syncState.status}`}>
                {syncState.status === 'idle' && 'Connected'}
                {syncState.status === 'syncing' && 'Syncing...'}
                {syncState.status === 'error' && 'Error'}
                {syncState.status === 'disconnected' && 'Not connected'}
              </span>
            </div>

            {syncState.userEmail && (
              <div className="sync-status-row">
                <span className="sync-status-label">Account</span>
                <span className="sync-status-value">{syncState.userEmail}</span>
              </div>
            )}

            {syncState.lastSyncedAt && (
              <div className="sync-status-row">
                <span className="sync-status-label">Last synced</span>
                <span className="sync-status-value">
                  {new Date(syncState.lastSyncedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="sync-error">
              {error}
            </div>
          )}

          {/* Setup Wizard (when not authenticated) */}
          {!syncState.isAuthenticated && (
            <>
              {renderStepIndicator()}
              {renderStepContent()}
            </>
          )}

          {/* Sync Toggle (when authenticated) */}
          {syncState.isAuthenticated && (
            <div className="sync-toggle-section">
              <label className="sync-toggle-row">
                <span>Auto-sync</span>
                <input
                  type="checkbox"
                  checked={syncState.status !== 'disconnected'}
                  onChange={(e) => onToggleSync(e.target.checked)}
                />
              </label>
              <p className="form-hint">
                Syncs text items, categories, and settings to Google Drive.
                Images are stored locally only.
              </p>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          {syncState.isAuthenticated ? (
            <>
              <button
                className="btn-secondary"
                onClick={handleLogout}
                disabled={loading}
              >
                Sign Out
              </button>
              <button
                className="btn-primary"
                onClick={onSyncNow}
                disabled={loading || syncState.status === 'syncing'}
              >
                {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            </>
          ) : (
            <>
              {step > 1 && (
                <button
                  className="btn-secondary"
                  onClick={() => setStep(step - 1)}
                  type="button"
                >
                  Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {step < TOTAL_STEPS ? (
                <button
                  className="btn-primary"
                  onClick={() => setStep(step + 1)}
                  type="button"
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleLogin}
                  disabled={loading || (!clientId.trim() && !clientSecret.trim())}
                >
                  {loading ? 'Connecting...' : 'Sign in with Google'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
