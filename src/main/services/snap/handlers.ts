/**
 * Snap IPC Handlers
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { SnapService } from './index';

export function registerSnapHandlers(
  service: SnapService,
  mainWindow: BrowserWindow
): void {
  // Capture screen region
  ipcMain.handle('snap:capture-region', async () => {
    // Hide main window before capture so it's not in the screenshot
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
    }

    // Small delay to ensure window is hidden
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.captureRegion();

    // Show window again after capture
    if (wasVisible) {
      mainWindow.show();
    }

    return result;
  });

  // Capture window
  ipcMain.handle('snap:capture-window', async () => {
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.captureWindow();

    if (wasVisible) {
      mainWindow.show();
    }

    return result;
  });

  // Get clipboard image
  ipcMain.handle('snap:get-clipboard-image', async () => {
    return service.getClipboardImage();
  });

  // Copy to clipboard
  ipcMain.handle('snap:copy-to-clipboard', async (_event, imageDataUrl: string) => {
    return service.copyToClipboard(imageDataUrl);
  });

  // Save to file
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

        // Extract base64 data from data URL
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
