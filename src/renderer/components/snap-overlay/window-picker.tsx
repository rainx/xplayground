import { useEffect, useState, useCallback } from 'react';
import './window-picker.css';

interface WindowSourceData {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}

export function WindowPicker(): JSX.Element {
  const [windows, setWindows] = useState<WindowSourceData[]>([]);

  // Listen for window sources from main process
  useEffect(() => {
    const cleanup = window.api.snap.overlay.onWindowSources((sources) => {
      setWindows(sources);
    });
    // Signal ready so main process sends window sources
    window.api.snap.overlay.signalReady(0);
    return cleanup;
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.api.snap.overlay.sendCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback((windowId: string) => {
    window.api.snap.overlay.selectWindow(windowId);
  }, []);

  return (
    <div className="window-picker-container">
      <div className="window-picker-card">
        <h2 className="window-picker-title">Select a Window to Capture</h2>
        <div className="window-picker-grid">
          {windows.map((win) => (
            <button
              key={win.id}
              className="window-picker-item"
              onClick={() => handleSelect(win.id)}
              title={win.name}
            >
              <div className="window-picker-thumbnail">
                <img
                  src={win.thumbnailDataUrl}
                  alt={win.name}
                  draggable={false}
                />
              </div>
              <span className="window-picker-name">{win.name}</span>
            </button>
          ))}
          {windows.length === 0 && (
            <div className="window-picker-loading">Loading windows...</div>
          )}
        </div>
        <div className="window-picker-hint">
          Press <kbd>Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
}
