/**
 * useSyncStatus - React hook for cloud sync state
 */

import { useState, useEffect, useCallback } from 'react';
import type { SyncState } from '../types';

const DEFAULT_STATE: SyncState = {
  status: 'disconnected',
  provider: null,
  lastSyncedAt: null,
  error: null,
  isAuthenticated: false,
  userEmail: null,
};

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);

  // Load initial state
  useEffect(() => {
    window.api.sync.getState().then((state: SyncState) => {
      setSyncState(state);
    });
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = window.api.sync.onStateChanged((state: unknown) => {
      setSyncState(state as SyncState);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.sync.login();
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await window.api.sync.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSync = useCallback(async (enabled: boolean) => {
    await window.api.sync.toggle(enabled);
  }, []);

  const syncNow = useCallback(async () => {
    await window.api.sync.syncNow();
  }, []);

  const setOAuthClient = useCallback(async (clientId: string, clientSecret: string) => {
    await window.api.sync.setOAuthClient({ clientId, clientSecret });
  }, []);

  return {
    syncState,
    loading,
    login,
    logout,
    toggleSync,
    syncNow,
    setOAuthClient,
  };
}
