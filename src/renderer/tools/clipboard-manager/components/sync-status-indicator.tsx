/**
 * SyncStatusIndicator - Header badge showing sync state
 */

import type { SyncState } from '../types';

interface SyncStatusIndicatorProps {
  syncState: SyncState;
  onClick: () => void;
}

export function SyncStatusIndicator({ syncState, onClick }: SyncStatusIndicatorProps): JSX.Element {
  const getStatusIcon = () => {
    const svgProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (syncState.status) {
      case 'syncing':
        return (
          <svg {...svgProps}>
            <path d="M2.5 8a5.5 5.5 0 0 1 9.7-3.5M13.5 8a5.5 5.5 0 0 1-9.7 3.5" />
            <path d="M12.2 1.5v3h-3M3.8 14.5v-3h3" />
          </svg>
        );
      case 'error':
        return (
          <svg {...svgProps}>
            <path d="M3.5 10.5a4 4 0 0 1-.25-7.75 5.5 5.5 0 0 1 10.5 1.75 3 3 0 0 1 .75 5.5" />
            <path d="M8 9v2M8 13v.5" />
          </svg>
        );
      case 'idle':
        return (
          <svg {...svgProps}>
            <path d="M3.5 10.5a4 4 0 0 1-.25-7.75 5.5 5.5 0 0 1 10.5 1.75 3 3 0 0 1 .75 5.5" />
            <path d="M6 13l2-2.5 2 2.5" />
          </svg>
        );
      case 'disconnected':
      default:
        return (
          <svg {...svgProps}>
            <path d="M3.5 10.5a4 4 0 0 1-.25-7.75 5.5 5.5 0 0 1 10.5 1.75 3 3 0 0 1 .75 5.5" />
            <path d="M6 12l4 3M10 12l-4 3" />
          </svg>
        );
    }
  };

  const getStatusClass = () => {
    const base = 'sync-indicator';
    switch (syncState.status) {
      case 'syncing':
        return `${base} syncing`;
      case 'error':
        return `${base} error`;
      case 'idle':
        return `${base} connected`;
      case 'disconnected':
      default:
        return `${base} disconnected`;
    }
  };

  const getTooltip = () => {
    if (!syncState.isAuthenticated) return 'Cloud sync: Not connected';
    if (syncState.status === 'syncing') return 'Syncing...';
    if (syncState.status === 'error') return `Sync error: ${syncState.error}`;
    if (syncState.lastSyncedAt) {
      const date = new Date(syncState.lastSyncedAt);
      return `Last synced: ${date.toLocaleTimeString()}`;
    }
    return 'Cloud sync: Connected';
  };

  return (
    <button
      className={getStatusClass()}
      onClick={onClick}
      title={getTooltip()}
    >
      <span className={syncState.status === 'syncing' ? 'sync-icon spinning' : 'sync-icon'}>
        {getStatusIcon()}
      </span>
    </button>
  );
}
