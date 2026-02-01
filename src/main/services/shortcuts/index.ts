/**
 * Keyboard Shortcuts Service
 * Manages global shortcut registration and persistence
 */

import { app, globalShortcut } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getCryptoService, isEncrypted } from '../crypto';
import type { CryptoService } from '../crypto';
import {
  ShortcutSettings,
  ShortcutBinding,
  ShortcutAction,
  ShortcutDefinition,
  DEFAULT_SHORTCUTS,
} from './types';

type ShortcutHandler = () => void;

export class ShortcutService {
  private settingsPath: string = '';
  private settings: ShortcutSettings;
  private cryptoService: CryptoService;
  private handlers: Map<ShortcutAction, ShortcutHandler> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.cryptoService = getCryptoService();
    this.settings = this.getDefaultSettings();
  }

  private getDefaultSettings(): ShortcutSettings {
    return {
      version: 1,
      bindings: DEFAULT_SHORTCUTS.map((def) => ({
        action: def.id,
        shortcut: def.defaultShortcut,
        enabled: true,
      })),
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.settingsPath = path.join(app.getPath('userData'), 'shortcuts.json');
    await this.loadSettings();
    this.initialized = true;
    console.log('ShortcutService initialized');
  }

  private async loadSettings(): Promise<void> {
    try {
      const fileData = await fs.readFile(this.settingsPath);
      if (isEncrypted(fileData)) {
        const loaded = await this.cryptoService.readAndDecryptJSON<ShortcutSettings>(
          this.settingsPath,
          'shortcuts'
        );
        this.mergeSettings(loaded);
      } else {
        const loaded = JSON.parse(fileData.toString('utf-8')) as ShortcutSettings;
        this.mergeSettings(loaded);
      }
    } catch {
      // Settings don't exist yet, use defaults
      console.log('No existing shortcut settings, using defaults');
    }
  }

  private mergeSettings(loaded: ShortcutSettings): void {
    // Merge loaded bindings with defaults to handle new shortcuts
    const loadedMap = new Map(loaded.bindings.map((b) => [b.action, b]));

    this.settings.bindings = DEFAULT_SHORTCUTS.map((def) => {
      const existing = loadedMap.get(def.id);
      if (existing) {
        return { ...existing };
      }
      return {
        action: def.id,
        shortcut: def.defaultShortcut,
        enabled: true,
      };
    });
  }

  async saveSettings(): Promise<void> {
    await this.cryptoService.encryptAndWriteJSON(this.settingsPath, this.settings, 'shortcuts');
  }

  registerHandler(action: ShortcutAction, handler: ShortcutHandler): void {
    this.handlers.set(action, handler);
  }

  registerAllShortcuts(): void {
    for (const binding of this.settings.bindings) {
      if (binding.enabled && binding.shortcut) {
        this.registerShortcut(binding);
      }
    }
  }

  private registerShortcut(binding: ShortcutBinding): boolean {
    const handler = this.handlers.get(binding.action);
    if (!handler) {
      console.warn(`No handler registered for action: ${binding.action}`);
      return false;
    }

    try {
      // Unregister first if already registered
      if (globalShortcut.isRegistered(binding.shortcut)) {
        globalShortcut.unregister(binding.shortcut);
      }

      const success = globalShortcut.register(binding.shortcut, handler);
      if (!success) {
        binding.lastError = `Failed to register shortcut: ${binding.shortcut}`;
        console.warn(binding.lastError);
        return false;
      }
      binding.lastError = undefined;
      console.log(`Registered shortcut: ${binding.shortcut} -> ${binding.action}`);
      return true;
    } catch (error) {
      binding.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error registering shortcut: ${binding.lastError}`);
      return false;
    }
  }

  async updateBinding(
    action: ShortcutAction,
    newShortcut: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validate for internal conflicts
    if (newShortcut) {
      const conflict = this.settings.bindings.find(
        (b) => b.action !== action && b.shortcut === newShortcut && b.enabled
      );
      if (conflict) {
        const conflictDef = DEFAULT_SHORTCUTS.find((d) => d.id === conflict.action);
        return {
          success: false,
          error: `Shortcut conflicts with "${conflictDef?.label || conflict.action}"`,
        };
      }
    }

    const binding = this.settings.bindings.find((b) => b.action === action);
    if (!binding) {
      return { success: false, error: 'Action not found' };
    }

    // Unregister old shortcut
    if (binding.shortcut) {
      try {
        globalShortcut.unregister(binding.shortcut);
      } catch {
        // Ignore errors during unregister
      }
    }

    // Update binding
    binding.shortcut = newShortcut;
    binding.lastError = undefined;

    // Register new shortcut if not empty
    if (newShortcut) {
      const registered = this.registerShortcut(binding);
      if (!registered) {
        await this.saveSettings();
        return { success: false, error: binding.lastError || 'Registration failed' };
      }
    }

    await this.saveSettings();
    return { success: true };
  }

  async resetToDefault(action: ShortcutAction): Promise<{ success: boolean; error?: string }> {
    const definition = DEFAULT_SHORTCUTS.find((d) => d.id === action);
    if (!definition) {
      return { success: false, error: 'Action not found' };
    }
    return this.updateBinding(action, definition.defaultShortcut);
  }

  getBindings(): ShortcutBinding[] {
    return this.settings.bindings.map((b) => ({ ...b }));
  }

  getDefinitions(): ShortcutDefinition[] {
    return [...DEFAULT_SHORTCUTS];
  }

  unregisterAll(): void {
    for (const binding of this.settings.bindings) {
      if (binding.shortcut) {
        try {
          globalShortcut.unregister(binding.shortcut);
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  }
}

// Singleton
let shortcutServiceInstance: ShortcutService | null = null;

export function getShortcutService(): ShortcutService {
  if (!shortcutServiceInstance) {
    shortcutServiceInstance = new ShortcutService();
  }
  return shortcutServiceInstance;
}
