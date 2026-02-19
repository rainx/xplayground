import { app, shell, BrowserWindow, globalShortcut, screen } from 'electron';
import { join } from 'path';
import { getClipboardService } from './services/clipboard';
import { registerClipboardHandlers, registerWindowHandlers } from './services/clipboard/handlers';
import { getSnapService } from './services/snap';
import { registerSnapHandlers, setOverlayCallbacks } from './services/snap/handlers';
import { getMigrationService } from './services/migration';
import { getCryptoService } from './services/crypto';
import { getShortcutService } from './services/shortcuts';
import { registerShortcutHandlers } from './services/shortcuts/handlers';
import { getCloudSyncService } from './services/cloud-sync';
import { registerCloudSyncHandlers } from './services/cloud-sync/handlers';
import { runCLI } from './cli/clipboard-cli';

// Check if running in CLI mode
const cliIndex = process.argv.findIndex((arg) => arg === '--cli');
const isCliMode = cliIndex !== -1;

let mainWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let overlayWindows: BrowserWindow[] = [];
let isQuitting = false;

function createOverlayWindows(mode: 'region' | 'window-picker'): BrowserWindow[] {
  destroyOverlayWindows();

  const displays = screen.getAllDisplays();

  if (mode === 'window-picker') {
    // Window picker only needs one overlay on the primary display
    const primary = screen.getPrimaryDisplay();
    const win = createSingleOverlay(mode, primary);
    overlayWindows = [win];
    return overlayWindows;
  }

  // Region mode: one overlay per display
  for (const display of displays) {
    const win = createSingleOverlay(mode, display);
    overlayWindows.push(win);
  }

  return overlayWindows;
}

function createSingleOverlay(
  mode: 'region' | 'window-picker',
  display: Electron.Display
): BrowserWindow {
  const { x, y, width, height } = display.bounds;

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  win.setSimpleFullScreen(true);

  const query = `mode=${mode}&displayId=${display.id}`;

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html?${query}`);
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay.html'), { query: { mode, displayId: String(display.id) } });
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  return win;
}

function destroyOverlayWindows(): void {
  for (const win of overlayWindows) {
    if (!win.isDestroyed()) {
      win.setSimpleFullScreen(false);
      win.close();
    }
  }
  overlayWindows = [];
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // On macOS, hide the window instead of destroying it when the user clicks close.
  // This keeps the app alive in the dock and allows global shortcuts to reopen it.
  if (process.platform === 'darwin') {
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load renderer URL in dev mode, or the built file in production
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

function createPopupWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Popup dimensions - nearly full screen width for more content
  const popupWidth = screenWidth - 40;
  const popupHeight = 320;

  // Position at bottom center of screen
  const x = Math.round((screenWidth - popupWidth) / 2);
  const y = screenHeight - popupHeight;

  popupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    // Panel type on macOS - creates NSPanel instead of NSWindow
    // This allows the window to appear without activating (stealing focus)
    type: 'panel',
    // Don't take focus from other apps
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  // Since the window is non-focusable, blur event won't fire normally
  // Instead, we'll hide the popup when:
  // 1. User presses Escape (handled via global shortcut)
  // 2. User clicks an item (handled in renderer)
  // 3. User presses the toggle shortcut again (handled in registerGlobalShortcuts)

  popupWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load popup renderer
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/popup.html`);
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/popup.html'));
  }

  return popupWindow;
}

function showPopupWindow(): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    popupWindow = createPopupWindow();
  }

  // Reposition popup to current primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const popupWidth = screenWidth - 40;
  const popupHeight = 320;
  const x = Math.round((screenWidth - popupWidth) / 2);
  const y = screenHeight - popupHeight;

  popupWindow.setBounds({ x, y, width: popupWidth, height: popupHeight });
  // Use showInactive() to display without stealing focus from other apps
  popupWindow.showInactive();

  // Register keyboard shortcuts for popup navigation (only while popup is visible)
  registerPopupKeyboardShortcuts();
}

function hidePopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
    // Restore non-focusable state when hidden
    popupWindow.setFocusable(false);
  }
  // Unregister popup-specific shortcuts when hidden
  unregisterPopupKeyboardShortcuts();
}

// Enable/disable focus for text input (e.g., editing category name)
export function setPopupFocusable(focusable: boolean): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.setFocusable(focusable);
    if (focusable) {
      // When enabling focus, also focus the window and unregister navigation shortcuts
      // to prevent them from interfering with text input
      popupWindow.focus();
      unregisterPopupKeyboardShortcuts();
    } else {
      // When disabling focus, re-register navigation shortcuts
      registerPopupKeyboardShortcuts();
    }
  }
}

// Keyboard shortcuts registered only while popup is visible
const popupShortcuts = ['Escape', 'Left', 'Right', 'Up', 'Down', 'Return', 'Enter'];

function registerPopupKeyboardShortcuts(): void {
  // Escape to close popup
  globalShortcut.register('Escape', () => {
    hidePopupWindow();
  });

  // Arrow keys for navigation
  globalShortcut.register('Left', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup:navigate', 'left');
    }
  });

  globalShortcut.register('Right', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup:navigate', 'right');
    }
  });

  globalShortcut.register('Up', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup:navigate', 'up');
    }
  });

  globalShortcut.register('Down', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup:navigate', 'down');
    }
  });

  // Enter to select current item
  globalShortcut.register('Return', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('popup:select');
    }
  });
}

function unregisterPopupKeyboardShortcuts(): void {
  for (const shortcut of popupShortcuts) {
    globalShortcut.unregister(shortcut);
  }
}

function togglePopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
    hidePopupWindow();
  } else {
    showPopupWindow();
  }
}

// Snap capture handlers for global shortcuts
// These trigger the capture flow by invoking the IPC handler from the renderer side.
// The IPC handler manages window hiding/showing, overlay creation, and result delivery.
// We send snap:navigate first to switch the renderer to the Snap tool,
// then invoke captureRegion/captureWindow, and forward the result via snap:captured.
async function handleSnapCaptureRegion(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Ensure window is shown (it may be hidden on macOS)
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  // Navigate to snap tool first
  mainWindow.webContents.send('snap:navigate');

  try {
    // Invoke the IPC handler directly - it handles hide/show/overlay
    const result = await mainWindow.webContents.executeJavaScript(
      `window.api.snap.captureRegion()`
    );

    // Send captured result to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.webContents.send('snap:captured', result);
    }
  } catch (error) {
    console.error('Snap capture region error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }
}

async function handleSnapCaptureWindow(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Ensure window is shown (it may be hidden on macOS)
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.webContents.send('snap:navigate');

  try {
    const result = await mainWindow.webContents.executeJavaScript(
      `window.api.snap.captureWindow()`
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.webContents.send('snap:captured', result);
    }
  } catch (error) {
    console.error('Snap capture window error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }
}

async function initializeServices(window: BrowserWindow): Promise<void> {
  try {
    // Initialize crypto service first
    const cryptoService = getCryptoService();
    await cryptoService.initialize();
    console.log('Crypto service initialized');

    // Check and run migration if needed
    const migrationService = getMigrationService();
    await migrationService.initialize();

    if (await migrationService.needsMigration()) {
      console.log('Migration needed, starting...');
      await migrationService.migrate();
    }

    // Initialize clipboard service
    const clipboardService = getClipboardService();
    await clipboardService.initialize();

    // Register IPC handlers
    registerClipboardHandlers(clipboardService, window);

    // Register Snap handlers
    const snapService = getSnapService();
    registerSnapHandlers(snapService, window);

    // Wire up overlay callbacks for snap service
    setOverlayCallbacks({
      createOverlay: createOverlayWindows,
      destroyOverlay: destroyOverlayWindows,
      getMainWindow: () => mainWindow,
    });

    // Initialize shortcut service
    const shortcutService = getShortcutService();
    await shortcutService.initialize();

    // Register action handlers for shortcuts
    shortcutService.registerHandler('clipboard:toggle-popup', togglePopupWindow);
    shortcutService.registerHandler('snap:capture-region', handleSnapCaptureRegion);
    shortcutService.registerHandler('snap:capture-window', handleSnapCaptureWindow);

    // Register all shortcuts from settings
    shortcutService.registerAllShortcuts();

    // Register shortcut IPC handlers
    registerShortcutHandlers(shortcutService);

    // Initialize cloud sync service
    const cloudSyncService = getCloudSyncService();
    await cloudSyncService.initialize();
    registerCloudSyncHandlers(cloudSyncService, window);

    // Hook clipboard changes to trigger sync
    clipboardService.on('clipboard-change', () => {
      cloudSyncService.scheduleSyncOnChange();
    });
    clipboardService.on('item-deleted', () => {
      cloudSyncService.scheduleSyncOnChange();
    });

    console.log('All services initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    // Still register handlers even if initialization fails
    // This allows the app to work in a degraded state
    const clipboardService = getClipboardService();
    registerClipboardHandlers(clipboardService, window);

    // Register Snap handlers in degraded state too
    const snapService = getSnapService();
    registerSnapHandlers(snapService, window);

    // Wire up overlay callbacks even in degraded state
    setOverlayCallbacks({
      createOverlay: createOverlayWindows,
      destroyOverlay: destroyOverlayWindows,
      getMainWindow: () => mainWindow,
    });

    // Try to initialize shortcut service in degraded state
    try {
      const shortcutService = getShortcutService();
      await shortcutService.initialize();
      shortcutService.registerHandler('clipboard:toggle-popup', togglePopupWindow);
      shortcutService.registerHandler('snap:capture-region', handleSnapCaptureRegion);
      shortcutService.registerHandler('snap:capture-window', handleSnapCaptureWindow);
      shortcutService.registerAllShortcuts();
      registerShortcutHandlers(shortcutService);
    } catch (shortcutError) {
      console.error('Failed to initialize shortcut service:', shortcutError);
    }
  }
}


app.whenReady().then(async () => {
  // CLI mode: run command and exit
  if (isCliMode) {
    try {
      // Initialize crypto service for CLI
      const cryptoService = getCryptoService();
      await cryptoService.initialize();

      // Get CLI arguments after --cli
      const cliArgs = process.argv.slice(cliIndex + 1);
      await runCLI(cliArgs);
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
    app.quit();
    return;
  }

  // Set app name for development mode (otherwise shows "Electron")
  if (!app.isPackaged) {
    app.setName('xToolbox');
  }

  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rainx.xtoolbox');
  }

  // Set dock icon for macOS in development
  if (process.platform === 'darwin' && !app.isPackaged) {
    const iconPath = join(__dirname, '../../resources/icon.png');
    app.dock?.setIcon(iconPath);
  }

  const window = createWindow();

  // Initialize services after window is created
  await initializeServices(window);

  // Create popup window (hidden initially)
  createPopupWindow();

  // Register window-related IPC handlers for both windows
  registerWindowHandlers(window, popupWindow);

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      const newWindow = createWindow();
      initializeServices(newWindow);
      createPopupWindow();
      registerWindowHandlers(newWindow, popupWindow);
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});

app.on('quit', () => {
  // Cleanup
  const clipboardService = getClipboardService();
  clipboardService.destroy();

  // Cleanup cloud sync
  const cloudSyncService = getCloudSyncService();
  cloudSyncService.destroy();

  // Clear crypto keys from memory
  const cryptoService = getCryptoService();
  cryptoService.shutdown();
});
