/**
 * Snap IPC Handlers
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { SnapService, CaptureResult, DisplayCapture, RegionSelection } from './index';
import { getScreenPermissionStatus, requestScreenPermission } from './permission';

// Module-level state for overlay orchestration
let pendingRegionResolve: ((result: CaptureResult) => void) | null = null;
let pendingWindowResolve: ((result: CaptureResult) => void) | null = null;
const pendingCaptures: Map<number, DisplayCapture> = new Map();

// These will be set by the main module via setOverlayCallbacks
let createOverlayFn: ((mode: 'region' | 'window-picker') => BrowserWindow[]) | null = null;
let destroyOverlayFn: (() => void) | null = null;
let getMainWindowFn: (() => BrowserWindow | null) | null = null;

export function setOverlayCallbacks(callbacks: {
  createOverlay: (mode: 'region' | 'window-picker') => BrowserWindow[];
  destroyOverlay: () => void;
  getMainWindow: () => BrowserWindow | null;
}): void {
  createOverlayFn = callbacks.createOverlay;
  destroyOverlayFn = callbacks.destroyOverlay;
  getMainWindowFn = callbacks.getMainWindow;
}

export function registerSnapHandlers(
  service: SnapService,
  mainWindow: BrowserWindow
): void {
  // Permission check
  ipcMain.handle('snap:check-permission', () => {
    return getScreenPermissionStatus();
  });

  // Permission request
  ipcMain.handle('snap:request-permission', async () => {
    return requestScreenPermission();
  });

  // Capture screen region via overlay
  ipcMain.handle('snap:capture-region', async () => {
    // Check permission first
    const status = getScreenPermissionStatus();
    if (status === 'not-determined') {
      const newStatus = await requestScreenPermission();
      if (newStatus !== 'granted') {
        return { success: false, error: 'Screen recording permission not granted' } as CaptureResult;
      }
    } else if (status !== 'granted') {
      await requestScreenPermission();
      return { success: false, error: 'Screen recording permission denied' } as CaptureResult;
    }

    // Hide main window before capture
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
    }

    // Wait for window to fully hide
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // Capture all screens
      const captures = await service.captureAllScreens();
      if (captures.length === 0) {
        if (wasVisible) mainWindow.show();
        return { success: false, error: 'No screens captured' } as CaptureResult;
      }

      // Store captures for later retrieval by overlay windows
      pendingCaptures.clear();
      for (const capture of captures) {
        pendingCaptures.set(capture.displayId, capture);
      }

      // Create overlay windows
      if (!createOverlayFn) {
        if (wasVisible) mainWindow.show();
        return { success: false, error: 'Overlay system not initialized' } as CaptureResult;
      }

      createOverlayFn('region');

      // Wait for selection or cancel from overlay
      const result = await new Promise<CaptureResult>((resolve) => {
        pendingRegionResolve = resolve;
      });

      return result;
    } catch (error) {
      console.error('Region capture failed:', error);
      destroyOverlayFn?.();
      if (wasVisible) mainWindow.show();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as CaptureResult;
    }
  });

  // Capture window via window picker overlay
  ipcMain.handle('snap:capture-window', async () => {
    // Check permission first
    const status = getScreenPermissionStatus();
    if (status === 'not-determined') {
      const newStatus = await requestScreenPermission();
      if (newStatus !== 'granted') {
        return { success: false, error: 'Screen recording permission not granted' } as CaptureResult;
      }
    } else if (status !== 'granted') {
      await requestScreenPermission();
      return { success: false, error: 'Screen recording permission denied' } as CaptureResult;
    }

    // Hide main window
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      if (!createOverlayFn) {
        if (wasVisible) mainWindow.show();
        return { success: false, error: 'Overlay system not initialized' } as CaptureResult;
      }

      createOverlayFn('window-picker');

      // Get window sources and send to overlay
      const windowSources = await service.getWindowSources();

      // Send window sources to all overlay windows (there should be one for window picker)
      const allWindows = BrowserWindow.getAllWindows();
      for (const win of allWindows) {
        if (!win.isDestroyed()) {
          const url = win.webContents.getURL();
          if (url.includes('mode=window-picker')) {
            win.webContents.send('snap:window-sources', windowSources);
          }
        }
      }

      // Wait for selection or cancel
      const result = await new Promise<CaptureResult>((resolve) => {
        pendingWindowResolve = resolve;
      });

      return result;
    } catch (error) {
      console.error('Window capture failed:', error);
      destroyOverlayFn?.();
      if (wasVisible) mainWindow.show();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as CaptureResult;
    }
  });

  // Overlay ready signal - send screenshot data to the specific overlay
  ipcMain.on('snap:overlay-ready', (event, displayId: number) => {
    const capture = pendingCaptures.get(displayId);
    if (capture) {
      event.sender.send('snap:overlay-screenshot', capture);
    }
    // For window picker mode, the ready signal triggers sending window sources
    // (handled in the capture-window handler above, on webContents ready-to-show)
  });

  // Overlay selection received - crop and resolve
  ipcMain.on('snap:overlay-selection', (_event, selection: RegionSelection) => {
    const capture = pendingCaptures.get(selection.displayId);

    // Destroy overlays and show main window
    destroyOverlayFn?.();
    pendingCaptures.clear();

    const mw = getMainWindowFn?.() ?? mainWindow;
    if (mw && !mw.isDestroyed()) {
      mw.show();
    }

    if (!capture || !pendingRegionResolve) {
      pendingRegionResolve?.({
        success: false,
        error: 'No capture data for display',
      });
      pendingRegionResolve = null;
      return;
    }

    const result = service.cropRegion(capture, selection);
    pendingRegionResolve(result);
    pendingRegionResolve = null;
  });

  // Overlay cancel
  ipcMain.on('snap:overlay-cancel', () => {
    destroyOverlayFn?.();
    pendingCaptures.clear();

    const mw = getMainWindowFn?.() ?? mainWindow;
    if (mw && !mw.isDestroyed()) {
      mw.show();
    }

    if (pendingRegionResolve) {
      pendingRegionResolve({ success: false, error: 'Capture cancelled' });
      pendingRegionResolve = null;
    }
    if (pendingWindowResolve) {
      pendingWindowResolve({ success: false, error: 'Capture cancelled' });
      pendingWindowResolve = null;
    }
  });

  // Window selected from picker
  ipcMain.handle('snap:window-selected', async (_event, windowId: string) => {
    destroyOverlayFn?.();

    const result = await service.captureWindowById(windowId);

    const mw = getMainWindowFn?.() ?? mainWindow;
    if (mw && !mw.isDestroyed()) {
      mw.show();
    }

    if (pendingWindowResolve) {
      pendingWindowResolve(result);
      pendingWindowResolve = null;
    }
  });

  // Get clipboard image (unchanged)
  ipcMain.handle('snap:get-clipboard-image', async () => {
    return service.getClipboardImage();
  });

  // Copy to clipboard (unchanged)
  ipcMain.handle('snap:copy-to-clipboard', async (_event, imageDataUrl: string) => {
    return service.copyToClipboard(imageDataUrl);
  });

  // Save to file (unchanged)
  ipcMain.handle(
    'snap:save-to-file',
    async (_event, imageDataUrl: string, defaultFilename: string) => {
      try {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          defaultPath: defaultFilename,
          filters: [
            { name: 'PNG Image', extensions: ['png'] },
            { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
            { name: 'WebP Image', extensions: ['webp'] },
          ],
        });

        if (canceled || !filePath) {
          return { success: false, error: 'Save cancelled' };
        }

        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        await writeFile(filePath, buffer);

        return { success: true, filePath };
      } catch (error) {
        console.error('Failed to save file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );
}
