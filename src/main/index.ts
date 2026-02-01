import { app, shell, BrowserWindow, globalShortcut, screen } from 'electron';
import { join } from 'path';
import { getClipboardService } from './services/clipboard';
import { registerClipboardHandlers, registerWindowHandlers } from './services/clipboard/handlers';
import { getMigrationService } from './services/migration';
import { getCryptoService } from './services/crypto';
import { runCLI } from './cli/clipboard-cli';

// Check if running in CLI mode
const cliIndex = process.argv.findIndex((arg) => arg === '--cli');
const isCliMode = cliIndex !== -1;

let mainWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;

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
  const popupHeight = 280;

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
  const popupHeight = 280;
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

    console.log('Clipboard service initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    // Still register handlers even if initialization fails
    // This allows the app to work in a degraded state
    const clipboardService = getClipboardService();
    registerClipboardHandlers(clipboardService, window);
  }
}

function registerGlobalShortcuts(): void {
  // Register global shortcut to show/toggle clipboard popup
  // Default: Option+Command+V (macOS) or Alt+Ctrl+V (Windows/Linux)
  const shortcut = process.platform === 'darwin' ? 'Alt+Command+V' : 'Alt+Control+V';

  const registered = globalShortcut.register(shortcut, () => {
    togglePopupWindow();
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut: ${shortcut}`);
  } else {
    console.log(`Global shortcut registered: ${shortcut}`);
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
    app.dock.setIcon(iconPath);
  }

  const window = createWindow();

  // Initialize services after window is created
  await initializeServices(window);

  // Create popup window (hidden initially)
  createPopupWindow();

  // Register global shortcuts
  registerGlobalShortcuts();

  // Register window-related IPC handlers for both windows
  registerWindowHandlers(window, popupWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow();
      initializeServices(newWindow);
      createPopupWindow();
      registerGlobalShortcuts();
      registerWindowHandlers(newWindow, popupWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});

app.on('quit', () => {
  // Cleanup
  const clipboardService = getClipboardService();
  clipboardService.destroy();

  // Clear crypto keys from memory
  const cryptoService = getCryptoService();
  cryptoService.shutdown();
});
