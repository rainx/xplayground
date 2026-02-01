/**
 * Snap - Main component for screenshot beautification tool
 */

import { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import type { SnapSettings, SnapImage, AspectRatioPreset } from './types';
import { DEFAULT_SETTINGS } from './types';
import { GRADIENT_PRESETS, ASPECT_RATIO_PRESETS, getGradientById, gradientToCSS } from './constants/presets';
import './styles/snap.css';

export function Snap(): JSX.Element {
  const [settings, setSettings] = useState<SnapSettings>(DEFAULT_SETTINGS);
  const [image, setImage] = useState<SnapImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const captureMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (captureMenuRef.current && !captureMenuRef.current.contains(e.target as Node)) {
        setShowCaptureMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for captures from global keyboard shortcut
  useEffect(() => {
    const unsubscribe = window.api.snap.onCaptured((result) => {
      if (result.success && result.imageData) {
        setImage({
          id: crypto.randomUUID(),
          dataUrl: result.imageData,
          width: result.width || 0,
          height: result.height || 0,
          name: 'Screenshot',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Capture region screenshot
  const handleCaptureRegion = useCallback(async () => {
    setShowCaptureMenu(false);
    setIsCapturing(true);
    try {
      const result = await window.api.snap.captureRegion();
      if (result.success && result.imageData) {
        setImage({
          id: crypto.randomUUID(),
          dataUrl: result.imageData,
          width: result.width || 0,
          height: result.height || 0,
          name: 'Screenshot',
        });
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Capture window screenshot
  const handleCaptureWindow = useCallback(async () => {
    setShowCaptureMenu(false);
    setIsCapturing(true);
    try {
      const result = await window.api.snap.captureWindow();
      if (result.success && result.imageData) {
        setImage({
          id: crypto.randomUUID(),
          dataUrl: result.imageData,
          width: result.width || 0,
          height: result.height || 0,
          name: 'Screenshot',
        });
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Get background CSS - must be defined before renderToCanvas
  const getBackgroundCSS = useCallback(() => {
    const { background } = settings;
    if (background.type === 'transparent') {
      return 'transparent';
    }
    if (background.type === 'solid') {
      return background.solidColor || '#ffffff';
    }
    if (background.type === 'gradient' && background.gradientId) {
      const gradient = getGradientById(background.gradientId);
      if (gradient) {
        return gradientToCSS(gradient);
      }
    }
    return '#667eea';
  }, [settings.background]);

  // Render preview to canvas and return data URL
  const renderToCanvas = useCallback(async (): Promise<string | null> => {
    if (!image || !previewRef.current) return null;

    // Get the preview element dimensions
    const previewElement = previewRef.current;
    const rect = previewElement.getBoundingClientRect();

    // Create canvas with the same dimensions
    const canvas = document.createElement('canvas');
    const scale = 2; // Render at 2x for better quality
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Draw background
    const bgCSS = getBackgroundCSS();
    if (bgCSS === 'transparent') {
      // Keep transparent
    } else if (bgCSS.includes('gradient')) {
      // Parse and draw gradient
      const gradient = settings.background.gradientId
        ? getGradientById(settings.background.gradientId)
        : null;
      if (gradient) {
        const angle = gradient.angle * Math.PI / 180;
        const x1 = rect.width / 2 - Math.cos(angle) * rect.width / 2;
        const y1 = rect.height / 2 - Math.sin(angle) * rect.height / 2;
        const x2 = rect.width / 2 + Math.cos(angle) * rect.width / 2;
        const y2 = rect.height / 2 + Math.sin(angle) * rect.height / 2;

        const linearGradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.colors.forEach((color, i) => {
          linearGradient.addColorStop(i / (gradient.colors.length - 1), color);
        });
        ctx.fillStyle = linearGradient;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    } else {
      // Solid color
      ctx.fillStyle = bgCSS;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Calculate padding
    const padding = settings.padding.mode === 'uniform'
      ? settings.padding.uniform
      : settings.padding.top; // Simplified for uniform padding

    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve) => {
      img.onload = () => {
        // Calculate image dimensions to fit within preview
        const maxWidth = 800;
        const maxHeight = 600;
        let imgWidth = img.width;
        let imgHeight = img.height;

        if (imgWidth > maxWidth) {
          imgHeight = (maxWidth / imgWidth) * imgHeight;
          imgWidth = maxWidth;
        }
        if (imgHeight > maxHeight) {
          imgWidth = (maxHeight / imgHeight) * imgWidth;
          imgHeight = maxHeight;
        }

        // Calculate position (centered)
        const x = padding;
        const y = padding;

        // Draw shadow if enabled
        if (settings.shadow.enabled) {
          ctx.save();
          ctx.shadowColor = `rgba(0, 0, 0, ${settings.shadow.opacity / 100})`;
          ctx.shadowBlur = settings.shadow.blur;
          ctx.shadowOffsetX = settings.shadow.offsetX;
          ctx.shadowOffsetY = settings.shadow.offsetY;

          // Draw a rounded rect for shadow
          ctx.beginPath();
          ctx.roundRect(x, y, imgWidth, imgHeight, settings.cornerRadius);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.restore();
        }

        // Clip to rounded rect for image
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, imgWidth, imgHeight, settings.cornerRadius);
        ctx.clip();

        // Draw image
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
        ctx.restore();

        // Return data URL
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => resolve(null);
      img.src = image.dataUrl;
    });
  }, [image, settings, getBackgroundCSS]);

  // Copy processed image to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!image) return;

    setShowExportMenu(false);
    setIsExporting(true);

    try {
      const dataUrl = await renderToCanvas();
      if (dataUrl) {
        const result = await window.api.snap.copyToClipboard(dataUrl);
        if (result.success) {
          console.log('Image copied to clipboard');
        } else {
          console.error('Failed to copy:', result.error);
        }
      }
    } finally {
      setIsExporting(false);
    }
  }, [image, renderToCanvas]);

  // Save processed image to file
  const handleSaveToFile = useCallback(async () => {
    if (!image) return;

    setShowExportMenu(false);
    setIsExporting(true);

    try {
      const dataUrl = await renderToCanvas();
      if (dataUrl) {
        const filename = `snap-${new Date().toISOString().slice(0, 10)}.png`;
        const result = await window.api.snap.saveToFile(dataUrl, filename);
        if (result.success) {
          console.log('Image saved to:', result.filePath);
        } else if (result.error !== 'Save cancelled') {
          console.error('Failed to save:', result.error);
        }
      }
    } finally {
      setIsExporting(false);
    }
  }, [image, renderToCanvas]);

  // Load image from blob
  const loadImageFromBlob = useCallback(async (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImage({
          id: crypto.randomUUID(),
          dataUrl,
          width: img.width,
          height: img.height,
          name: 'Screenshot',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(blob);
  }, []);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            await loadImageFromBlob(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [loadImageFromBlob]);

  // Keyboard shortcuts (Cmd+C to copy, Cmd+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;

      // Cmd+C / Ctrl+C - Copy to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        // Only handle if no text is selected
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          e.preventDefault();
          handleCopyToClipboard();
        }
      }

      // Cmd+S / Ctrl+S - Save to file
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveToFile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [image, handleCopyToClipboard, handleSaveToFile]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await loadImageFromBlob(file);
      }
    }
  }, [loadImageFromBlob]);

  // Update individual settings
  const updateSettings = useCallback(<K extends keyof SnapSettings>(
    key: K,
    value: SnapSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Get shadow CSS
  const getShadowCSS = useCallback(() => {
    const { shadow } = settings;
    if (!shadow.enabled) return 'none';
    const color = `rgba(0, 0, 0, ${shadow.opacity / 100})`;
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${color}`;
  }, [settings.shadow]);

  // Get container padding
  const getPadding = useCallback(() => {
    const { padding } = settings;
    if (padding.mode === 'uniform') {
      return padding.uniform;
    }
    return `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }, [settings.padding]);

  return (
    <div className="snap-tool">
      {/* Toolbar */}
      <div className="snap-toolbar">
        <div className="snap-toolbar-left">
          <div className="snap-capture-wrapper" ref={captureMenuRef}>
            <button
              className="snap-btn"
              onClick={() => setShowCaptureMenu(!showCaptureMenu)}
              disabled={isCapturing}
              title="Capture screenshot"
            >
              <span>{isCapturing ? 'Capturing...' : 'Capture'}</span>
              <span className="snap-btn-arrow">▼</span>
            </button>
            {showCaptureMenu && (
              <div className="snap-capture-menu">
                <button className="snap-capture-menu-item" onClick={handleCaptureRegion}>
                  <span className="snap-capture-menu-icon">⬚</span>
                  <span>Capture Region</span>
                  <span className="snap-capture-menu-hint">Select area</span>
                </button>
                <button className="snap-capture-menu-item" onClick={handleCaptureWindow}>
                  <span className="snap-capture-menu-icon">▢</span>
                  <span>Capture Window</span>
                  <span className="snap-capture-menu-hint">Click window</span>
                </button>
              </div>
            )}
          </div>
          <button className="snap-btn" title="Import image file">
            <span>Import</span>
          </button>
        </div>
        <div className="snap-toolbar-right">
          <div className="snap-export-wrapper" ref={exportMenuRef}>
            <button
              className="snap-btn snap-btn-primary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!image || isExporting}
              title="Export image"
            >
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <span className="snap-btn-arrow">▼</span>
            </button>
            {showExportMenu && (
              <div className="snap-export-menu">
                <button className="snap-export-menu-item" onClick={handleCopyToClipboard}>
                  <span className="snap-export-menu-icon">📋</span>
                  <span>Copy to Clipboard</span>
                  <span className="snap-export-menu-hint">⌘C</span>
                </button>
                <button className="snap-export-menu-item" onClick={handleSaveToFile}>
                  <span className="snap-export-menu-icon">💾</span>
                  <span>Save to File</span>
                  <span className="snap-export-menu-hint">⌘S</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="snap-content">
        {/* Canvas area */}
        <div
          className="snap-canvas-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!image ? (
            <div className={`snap-drop-zone ${isDragOver ? 'drag-over' : ''}`}>
              <div className="snap-drop-zone-icon">📷</div>
              <div className="snap-drop-zone-title">Drop an image here</div>
              <div className="snap-drop-zone-hint">
                or paste from clipboard with <kbd>Cmd</kbd> + <kbd>V</kbd>
              </div>
            </div>
          ) : (
            <div className="snap-preview-wrapper">
              <div
                ref={previewRef}
                className="snap-preview"
                style={{
                  background: getBackgroundCSS(),
                  padding: typeof getPadding() === 'number' ? `${getPadding()}px` : getPadding(),
                }}
              >
                <div
                  className="snap-preview-image-container"
                  style={{
                    borderRadius: `${settings.cornerRadius}px`,
                    boxShadow: getShadowCSS(),
                    overflow: 'hidden',
                  }}
                >
                  <img
                    className="snap-preview-image"
                    src={image.dataUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '800px',
                      maxHeight: '600px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar controls */}
        <div className="snap-sidebar">
          {/* Background */}
          <div className="snap-control-section">
            <span className="snap-control-label">Background</span>
            <div className="snap-gradient-grid">
              {GRADIENT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className={`snap-gradient-item ${
                    settings.background.gradientId === preset.id ? 'selected' : ''
                  }`}
                  style={{ background: gradientToCSS(preset) }}
                  title={preset.name}
                  onClick={() =>
                    updateSettings('background', {
                      type: 'gradient',
                      gradientId: preset.id,
                    })
                  }
                />
              ))}
              {/* Transparent option */}
              <div
                className={`snap-gradient-item snap-gradient-transparent ${
                  settings.background.type === 'transparent' ? 'selected' : ''
                }`}
                title="Transparent"
                onClick={() =>
                  updateSettings('background', { type: 'transparent' })
                }
              />
            </div>
          </div>

          {/* Padding */}
          <div className="snap-control-section">
            <div className="snap-slider-control">
              <div className="snap-slider-header">
                <span className="snap-control-label" style={{ marginBottom: 0 }}>
                  Padding
                </span>
                <span className="snap-slider-value">{settings.padding.uniform}px</span>
              </div>
              <input
                type="range"
                className="snap-slider"
                min="0"
                max="200"
                value={settings.padding.uniform}
                onChange={(e) =>
                  updateSettings('padding', {
                    ...settings.padding,
                    uniform: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Corner Radius */}
          <div className="snap-control-section">
            <div className="snap-slider-control">
              <div className="snap-slider-header">
                <span className="snap-control-label" style={{ marginBottom: 0 }}>
                  Corner Radius
                </span>
                <span className="snap-slider-value">{settings.cornerRadius}px</span>
              </div>
              <input
                type="range"
                className="snap-slider"
                min="0"
                max="48"
                value={settings.cornerRadius}
                onChange={(e) => updateSettings('cornerRadius', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Shadow */}
          <div className="snap-control-section">
            <div
              className="snap-toggle"
              onClick={() =>
                updateSettings('shadow', {
                  ...settings.shadow,
                  enabled: !settings.shadow.enabled,
                })
              }
            >
              <div className={`snap-toggle-switch ${settings.shadow.enabled ? 'active' : ''}`} />
              <span className="snap-toggle-label">Shadow</span>
            </div>
            {settings.shadow.enabled && (
              <div className="snap-shadow-controls">
                <div className="snap-slider-control">
                  <div className="snap-slider-header">
                    <span className="snap-slider-value">Blur</span>
                    <span className="snap-slider-value">{settings.shadow.blur}px</span>
                  </div>
                  <input
                    type="range"
                    className="snap-slider"
                    min="0"
                    max="100"
                    value={settings.shadow.blur}
                    onChange={(e) =>
                      updateSettings('shadow', {
                        ...settings.shadow,
                        blur: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="snap-slider-control">
                  <div className="snap-slider-header">
                    <span className="snap-slider-value">Offset Y</span>
                    <span className="snap-slider-value">{settings.shadow.offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    className="snap-slider"
                    min="0"
                    max="50"
                    value={settings.shadow.offsetY}
                    onChange={(e) =>
                      updateSettings('shadow', {
                        ...settings.shadow,
                        offsetY: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="snap-slider-control">
                  <div className="snap-slider-header">
                    <span className="snap-slider-value">Opacity</span>
                    <span className="snap-slider-value">{settings.shadow.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    className="snap-slider"
                    min="0"
                    max="100"
                    value={settings.shadow.opacity}
                    onChange={(e) =>
                      updateSettings('shadow', {
                        ...settings.shadow,
                        opacity: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Aspect Ratio */}
          <div className="snap-control-section">
            <span className="snap-control-label">Aspect Ratio</span>
            <div className="snap-ratio-grid">
              {(['auto', '4:3', '16:9', '1:1'] as AspectRatioPreset[]).map((ratio) => (
                <button
                  key={ratio}
                  className={`snap-ratio-btn ${settings.aspectRatio === ratio ? 'selected' : ''}`}
                  onClick={() => updateSettings('aspectRatio', ratio)}
                >
                  {ASPECT_RATIO_PRESETS[ratio].label}
                </button>
              ))}
            </div>
            <div className="snap-ratio-grid" style={{ marginTop: '6px' }}>
              {(['twitter', 'instagram', 'linkedin'] as AspectRatioPreset[]).map((ratio) => (
                <button
                  key={ratio}
                  className={`snap-ratio-btn ${settings.aspectRatio === ratio ? 'selected' : ''}`}
                  onClick={() => updateSettings('aspectRatio', ratio)}
                >
                  {ASPECT_RATIO_PRESETS[ratio].label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-center */}
          <div className="snap-control-section">
            <div
              className="snap-toggle"
              onClick={() => updateSettings('autoCenter', !settings.autoCenter)}
            >
              <div className={`snap-toggle-switch ${settings.autoCenter ? 'active' : ''}`} />
              <span className="snap-toggle-label">Auto-center</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hints */}
      <div className="snap-footer">
        <span><kbd>Cmd</kbd>+<kbd>V</kbd> paste</span>
        <span><kbd>Cmd</kbd>+<kbd>C</kbd> copy</span>
        <span><kbd>Cmd</kbd>+<kbd>S</kbd> save</span>
        <span>Drag to export</span>
      </div>
    </div>
  );
}
