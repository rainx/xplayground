/**
 * Keyboard Shortcuts IPC Handlers
 */

import { ipcMain } from 'electron';
import { ShortcutService } from './index';
import { ShortcutAction } from './types';

export function registerShortcutHandlers(service: ShortcutService): void {
  // Get all shortcut definitions and current bindings
  ipcMain.handle('shortcuts:get-all', async () => {
    return {
      definitions: service.getDefinitions(),
      bindings: service.getBindings(),
    };
  });

  // Update a shortcut binding
  ipcMain.handle(
    'shortcuts:update-binding',
    async (_event, action: ShortcutAction, newShortcut: string) => {
      return service.updateBinding(action, newShortcut);
    }
  );

  // Reset a shortcut to default
  ipcMain.handle('shortcuts:reset-to-default', async (_event, action: ShortcutAction) => {
    return service.resetToDefault(action);
  });

  // Reset all shortcuts to defaults
  ipcMain.handle('shortcuts:reset-all', async () => {
    const definitions = service.getDefinitions();
    const results: Array<{ action: string; success: boolean; error?: string }> = [];

    for (const def of definitions) {
      const result = await service.resetToDefault(def.id);
      results.push({ action: def.id, ...result });
    }

    return results;
  });
}
