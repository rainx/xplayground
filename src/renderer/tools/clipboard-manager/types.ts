/**
 * Clipboard Manager Types - Renderer
 */

export type ClipboardContentType = 'text' | 'rich_text' | 'image' | 'file' | 'link' | 'color';

export interface SourceAppInfo {
  bundleId: string;
  name: string;
}

export interface TextContent {
  plainText: string;
  rtfData?: string;
  htmlData?: string;
  characterCount: number;
  lineCount: number;
}

export interface ImageContent {
  originalPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

export interface FileReference {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
}

export interface FileContent {
  files: FileReference[];
}

export interface LinkContent {
  url: string;
  title?: string;
  description?: string;
  faviconPath?: string;
  domain: string;
}

export interface ClipboardItem {
  id: string;
  type: ClipboardContentType;
  createdAt: string;
  sourceApp: SourceAppInfo | null;

  textContent?: TextContent;
  imageContent?: ImageContent;
  fileContent?: FileContent;
  linkContent?: LinkContent;

  searchableText: string;
  isPinned: boolean;
  pinboardIds: string[];
}

export interface SearchFilter {
  query: string;
  contentTypes?: ClipboardContentType[];
  sourceApps?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ClipboardHistoryResponse {
  items: ClipboardItem[];
  totalCount: number;
  hasMore: boolean;
}

// Category types
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateInput {
  name: string;
  icon?: string;
  color?: string;
}

export interface CategoryUpdateInput {
  name?: string;
  icon?: string;
  color?: string;
  order?: number;
}

// Window API type extension
declare global {
  interface Window {
    api: {
      clipboard: {
        getHistory: (options?: { limit?: number; offset?: number }) => Promise<ClipboardHistoryResponse>;
        getItem: (id: string) => Promise<ClipboardItem | null>;
        deleteItem: (id: string) => Promise<{ success: boolean }>;
        pasteItem: (id: string) => Promise<{ success: boolean }>;
        search: (filter: SearchFilter) => Promise<ClipboardItem[]>;
        getSettings: () => Promise<Record<string, unknown>>;
        updateSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
        clearHistory: () => Promise<{ success: boolean; deletedCount: number }>;
        clearCategoryItems: (categoryId: string) => Promise<{ success: boolean; deletedCount: number }>;
        onItemAdded: (callback: (item: ClipboardItem) => void) => () => void;
        onItemDeleted: (callback: (id: string) => void) => () => void;
        onItemCategoryChanged: (callback: (data: { itemId: string; categoryIds: string[] }) => void) => () => void;
        duplicateItem: (id: string) => Promise<ClipboardItem | null>;
        categories: {
          getAll: () => Promise<Category[]>;
          create: (input: CategoryCreateInput) => Promise<Category>;
          update: (id: string, updates: CategoryUpdateInput) => Promise<Category | null>;
          delete: (id: string) => Promise<{ success: boolean }>;
          reorder: (orderedIds: string[]) => Promise<{ success: boolean }>;
          assignItem: (itemId: string, categoryId: string) => Promise<{ success: boolean }>;
          removeItem: (itemId: string, categoryId: string) => Promise<{ success: boolean }>;
          clearItemCategories: (itemId: string) => Promise<{ success: boolean }>;
          getItems: (categoryId: string, options?: { limit?: number; offset?: number }) => Promise<ClipboardHistoryResponse>;
          onCreated: (callback: (category: Category) => void) => () => void;
          onUpdated: (callback: (category: Category) => void) => () => void;
          onDeleted: (callback: (id: string) => void) => () => void;
        };
      };
    };
  }
}
