import { app, shell, BrowserWindow, globalShortcut } from 'electron';
import { join } from 'path';
import { getClipboardService } from './services/clipboard';
import { registerClipboardHandlers, registerWindowHandlers } from './services/clipboard/handlers';

let mainWindow: BrowserWindow | null = null;

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

async function initializeServices(window: BrowserWindow): Promise<void> {
  try {
    // Initialize clipboard service
    const clipboardService = getClipboardService();
    await clipboardService.initialize();

    // Register IPC handlers
    registerClipboardHandlers(clipboardService, window);

    console.log('Clipboard service initialized');
  } catch (error) {
    console.error('Failed to initialize clipboard service:', error);
    // Still register handlers even if initialization fails
    // This allows the app to work in a degraded state
    const clipboardService = getClipboardService();
    registerClipboardHandlers(clipboardService, window);
  }
}

function registerGlobalShortcuts(): void {
  // Register global shortcut to show/focus clipboard window
  // Default: Option+Command+V (macOS) or Alt+Ctrl+V (Windows/Linux)
  const shortcut = process.platform === 'darwin' ? 'Alt+Command+V' : 'Alt+Control+V';

  const registered = globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut: ${shortcut}`);
  } else {
    console.log(`Global shortcut registered: ${shortcut}`);
  }
}

app.whenReady().then(async () => {
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

  // Register global shortcuts
  registerGlobalShortcuts();

  // Register window-related IPC handlers
  registerWindowHandlers(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow();
      initializeServices(newWindow);
      registerGlobalShortcuts();
      registerWindowHandlers(newWindow);
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
});
