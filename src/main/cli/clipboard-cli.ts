#!/usr/bin/env node
/**
 * Clipboard CLI - Command line interface for clipboard category and item management
 *
 * This CLI is designed for LLM agents to programmatically manage clipboard data.
 * All output is JSON for easy parsing.
 *
 * Usage:
 *   pnpm cli clipboard <command> [subcommand] [options]
 *
 * Scopes:
 *   clipboard    Clipboard manager commands (category, item)
 *
 * Commands (under clipboard scope):
 *   category list                         List all categories
 *   category get <id>                     Get a category by ID
 *   category create <name> [options]      Create a new category
 *   category update <id> [options]        Update a category
 *   category delete <id>                  Delete a category
 *   category reorder <id1> <id2> ...      Reorder categories
 *
 *   item list [options]                   List clipboard items
 *   item get <id>                         Get an item by ID
 *   item delete <id>                      Delete an item
 *   item search <query> [options]         Search items
 *   item assign <itemId> <categoryId>     Assign item to category
 *   item unassign <itemId> <categoryId>   Remove item from category
 *   item clear-categories <itemId>        Clear all categories from item
 *   item list-by-category <categoryId>    List items in a category
 *   item duplicate <itemId>               Duplicate an item
 */

import { CategoryStorage } from '../services/clipboard/category-storage';
import { ClipboardStorage } from '../services/clipboard/storage';
import type { CategoryCreateInput, CategoryUpdateInput, SearchFilter } from '../services/clipboard/types';

interface CLIResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function output(result: CLIResult): void {
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(args: string[]): { command: string; subcommand: string; rest: string[] } {
  const [command = '', subcommand = '', ...rest] = args;
  return { command, subcommand, rest };
}

function parseOptions(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      options[key] = value;
    }
  }
  return options;
}

// Category commands
async function handleCategoryCommand(
  storage: CategoryStorage,
  subcommand: string,
  args: string[]
): Promise<CLIResult> {
  const options = parseOptions(args);

  switch (subcommand) {
    case 'list': {
      const categories = await storage.getCategories();
      return { success: true, data: categories };
    }

    case 'get': {
      const id = args[0];
      if (!id) {
        return { success: false, error: 'Missing category ID' };
      }
      const category = await storage.getCategoryById(id);
      if (!category) {
        return { success: false, error: `Category not found: ${id}` };
      }
      return { success: true, data: category };
    }

    case 'create': {
      const name = args[0];
      if (!name) {
        return { success: false, error: 'Missing category name' };
      }
      const input: CategoryCreateInput = {
        name,
        icon: options.icon,
        color: options.color,
      };
      const category = await storage.createCategory(input);
      return { success: true, data: category };
    }

    case 'update': {
      const id = args[0];
      if (!id) {
        return { success: false, error: 'Missing category ID' };
      }
      const updates: CategoryUpdateInput = {};
      if (options.name) updates.name = options.name;
      if (options.icon) updates.icon = options.icon;
      if (options.color) updates.color = options.color;
      if (options.order) updates.order = parseInt(options.order, 10);

      if (Object.keys(updates).length === 0) {
        return { success: false, error: 'No updates provided' };
      }

      const category = await storage.updateCategory(id, updates);
      if (!category) {
        return { success: false, error: `Category not found: ${id}` };
      }
      return { success: true, data: category };
    }

    case 'delete': {
      const id = args[0];
      if (!id) {
        return { success: false, error: 'Missing category ID' };
      }
      const deleted = await storage.deleteCategory(id);
      if (!deleted) {
        return { success: false, error: `Category not found: ${id}` };
      }
      return { success: true, data: { deleted: true, id } };
    }

    case 'reorder': {
      const ids = args.filter((arg) => !arg.startsWith('--'));
      if (ids.length === 0) {
        return { success: false, error: 'Missing category IDs' };
      }
      await storage.reorderCategories(ids);
      return { success: true, data: { reordered: true, ids } };
    }

    default:
      return {
        success: false,
        error: `Unknown category subcommand: ${subcommand}. Available: list, get, create, update, delete, reorder`,
      };
  }
}

// Item commands
async function handleItemCommand(
  storage: ClipboardStorage,
  subcommand: string,
  args: string[]
): Promise<CLIResult> {
  const options = parseOptions(args);

  switch (subcommand) {
    case 'list': {
      const limit = options.limit ? parseInt(options.limit, 10) : 50;
      const offset = options.offset ? parseInt(options.offset, 10) : 0;
      const result = await storage.getHistory({ limit, offset });
      return { success: true, data: result };
    }

    case 'get': {
      const id = args[0];
      if (!id) {
        return { success: false, error: 'Missing item ID' };
      }
      const item = await storage.getItem(id);
      if (!item) {
        return { success: false, error: `Item not found: ${id}` };
      }
      return { success: true, data: item };
    }

    case 'delete': {
      const id = args[0];
      if (!id) {
        return { success: false, error: 'Missing item ID' };
      }
      const deleted = await storage.deleteItem(id);
      if (!deleted) {
        return { success: false, error: `Item not found: ${id}` };
      }
      return { success: true, data: { deleted: true, id } };
    }

    case 'search': {
      const query = args[0];
      if (!query) {
        return { success: false, error: 'Missing search query' };
      }
      const filter: SearchFilter = { query };
      if (options.types) {
        filter.contentTypes = options.types.split(',') as SearchFilter['contentTypes'];
      }
      const items = await storage.search(filter);
      return { success: true, data: { items, count: items.length } };
    }

    case 'assign': {
      const itemId = args[0];
      const categoryId = args[1];
      if (!itemId || !categoryId) {
        return { success: false, error: 'Missing itemId or categoryId' };
      }
      const assigned = await storage.assignCategory(itemId, categoryId);
      if (!assigned) {
        return { success: false, error: `Failed to assign: item ${itemId} not found` };
      }
      return { success: true, data: { assigned: true, itemId, categoryId } };
    }

    case 'unassign': {
      const itemId = args[0];
      const categoryId = args[1];
      if (!itemId || !categoryId) {
        return { success: false, error: 'Missing itemId or categoryId' };
      }
      const removed = await storage.removeCategory(itemId, categoryId);
      if (!removed) {
        return { success: false, error: `Failed to unassign: item ${itemId} not in category ${categoryId}` };
      }
      return { success: true, data: { unassigned: true, itemId, categoryId } };
    }

    case 'clear-categories': {
      const itemId = args[0];
      if (!itemId) {
        return { success: false, error: 'Missing item ID' };
      }
      const cleared = await storage.clearItemCategories(itemId);
      if (!cleared) {
        return { success: false, error: `Item not found: ${itemId}` };
      }
      return { success: true, data: { cleared: true, itemId } };
    }

    case 'list-by-category': {
      const categoryId = args[0];
      if (!categoryId) {
        return { success: false, error: 'Missing category ID' };
      }
      const limit = options.limit ? parseInt(options.limit, 10) : 50;
      const offset = options.offset ? parseInt(options.offset, 10) : 0;
      const result = await storage.getItemsByCategory(categoryId, { limit, offset });
      return { success: true, data: result };
    }

    case 'duplicate': {
      const itemId = args[0];
      if (!itemId) {
        return { success: false, error: 'Missing item ID' };
      }
      const duplicated = await storage.duplicateItem(itemId);
      if (!duplicated) {
        return { success: false, error: `Item not found: ${itemId}` };
      }
      return { success: true, data: duplicated };
    }

    default:
      return {
        success: false,
        error: `Unknown item subcommand: ${subcommand}. Available: list, get, delete, search, assign, unassign, clear-categories, list-by-category, duplicate`,
      };
  }
}

function showHelp(scope?: string): CLIResult {
  if (scope === 'clipboard') {
    return {
      success: true,
      data: {
        scope: 'clipboard',
        usage: 'pnpm cli clipboard <command> [subcommand] [options]',
        commands: {
          category: {
            list: 'List all categories',
            get: '<id> - Get a category by ID',
            create: '<name> [--icon <icon>] [--color <color>] - Create a new category',
            update: '<id> [--name <name>] [--icon <icon>] [--color <color>] [--order <n>] - Update a category',
            delete: '<id> - Delete a category',
            reorder: '<id1> <id2> ... - Reorder categories',
          },
          item: {
            list: '[--limit <n>] [--offset <n>] - List clipboard items',
            get: '<id> - Get an item by ID',
            delete: '<id> - Delete an item',
            search: '<query> [--types <text,image,...>] - Search items',
            assign: '<itemId> <categoryId> - Assign item to category',
            unassign: '<itemId> <categoryId> - Remove item from category',
            'clear-categories': '<itemId> - Clear all categories from item',
            'list-by-category': '<categoryId> [--limit <n>] [--offset <n>] - List items in a category',
            duplicate: '<itemId> - Duplicate an item',
          },
        },
      },
    };
  }

  // Top-level help
  return {
    success: true,
    data: {
      usage: 'pnpm cli <scope> <command> [subcommand] [options]',
      scopes: {
        clipboard: 'Clipboard manager - manage clipboard history and categories',
        help: 'Show this help message',
      },
      examples: [
        'pnpm cli clipboard category list',
        'pnpm cli clipboard item search "hello"',
        'pnpm cli clipboard help',
      ],
    },
  };
}

async function handleClipboardScope(command: string, subcommand: string, rest: string[]): Promise<CLIResult> {
  if (!command || command === 'help' || command === '--help') {
    return showHelp('clipboard');
  }

  // Initialize storage
  const categoryStorage = new CategoryStorage();
  const clipboardStorage = new ClipboardStorage();

  await clipboardStorage.initialize();
  await categoryStorage.initialize();

  switch (command) {
    case 'category':
      return await handleCategoryCommand(categoryStorage, subcommand, rest);
    case 'item':
      return await handleItemCommand(clipboardStorage, subcommand, rest);
    default:
      return {
        success: false,
        error: `Unknown clipboard command: ${command}. Available: category, item, help`,
      };
  }
}

export async function runCLI(cliArgs: string[]): Promise<void> {
  const { command: scope, subcommand: command, rest } = parseArgs(cliArgs);
  const [subcommand = '', ...subRest] = rest;

  // Top-level help
  if (!scope || scope === 'help' || scope === '--help') {
    output(showHelp());
    return;
  }

  try {
    let result: CLIResult;

    switch (scope) {
      case 'clipboard':
        result = await handleClipboardScope(command, subcommand, subRest);
        break;
      default:
        result = {
          success: false,
          error: `Unknown scope: ${scope}. Available scopes: clipboard, help`,
        };
    }

    output(result);
  } catch (error) {
    output({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
