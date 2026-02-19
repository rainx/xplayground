import { useEffect, useRef, useState, useCallback } from 'react';
import './region-select.css';

interface RegionSelectProps {
  displayId: number;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function RegionSelect({ displayId }: RegionSelectProps): JSX.Element {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Signal ready to main process
  useEffect(() => {
    window.api.snap.overlay.signalReady(displayId);
  }, [displayId]);

  // Listen for screenshot data from main process
  useEffect(() => {
    const cleanup = window.api.snap.overlay.onScreenshot((data) => {
      setScreenshotUrl(data.imageDataUrl);
    });
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!screenshotUrl) return;
      setIsSelecting(true);
      setSelection({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
    },
    [screenshotUrl]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selection) return;
      setSelection((prev) =>
        prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null
      );
    },
    [isSelecting, selection]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selection) return;
    setIsSelecting(false);

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);

    // Ignore tiny selections (< 3px) as accidental clicks
    if (width < 3 || height < 3) {
      setSelection(null);
      return;
    }

    window.api.snap.overlay.sendSelection({
      displayId,
      x,
      y,
      width,
      height,
    });
  }, [isSelecting, selection, displayId]);

  // Calculate normalized selection rect
  const selRect = selection
    ? {
        x: Math.min(selection.startX, selection.endX),
        y: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="region-select-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Screenshot background */}
      {screenshotUrl && (
        <img
          className="region-select-bg"
          src={screenshotUrl}
          alt=""
          draggable={false}
        />
      )}

      {/* Dark overlay mask */}
      <div className="region-select-mask" />

      {/* Selection rectangle with clear cutout */}
      {selRect && selRect.width > 0 && selRect.height > 0 && (
        <>
          {/* Clear area showing the screenshot underneath */}
          <div
            className="region-select-clear"
            style={{
              left: selRect.x,
              top: selRect.y,
              width: selRect.width,
              height: selRect.height,
              backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : undefined,
              backgroundPosition: `-${selRect.x}px -${selRect.y}px`,
              backgroundSize: '100vw 100vh',
            }}
          />
          {/* Selection border */}
          <div
            className="region-select-border"
            style={{
              left: selRect.x,
              top: selRect.y,
              width: selRect.width,
              height: selRect.height,
            }}
          />
          {/* Dimension label */}
          <div
            className="region-select-dimensions"
            style={{
              left: selRect.x + selRect.width / 2,
              top: selRect.y + selRect.height + 8,
            }}
          >
            {Math.round(selRect.width)} × {Math.round(selRect.height)}
          </div>
        </>
      )}
    </div>
  );
}
