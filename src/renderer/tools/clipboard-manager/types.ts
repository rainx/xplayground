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

export interface ColorContent {
  hexValue: string;  // e.g., "#F5AB82" or "F5AB82"
  displayValue: string;  // Normalized display value with # prefix
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
  colorContent?: ColorContent;

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
      window: {
        show: () => Promise<{ success: boolean }>;
        hide: () => Promise<{ success: boolean }>;
      };
      popup: {
        onNavigate: (callback: (direction: 'left' | 'right' | 'up' | 'down') => void) => () => void;
        onSelect: (callback: () => void) => () => void;
        setFocusable: (focusable: boolean) => Promise<{ success: boolean }>;
        openMainWithDialog: (dialogType: 'edit' | 'ai-modify', itemId: string) => Promise<{ success: boolean }>;
      };
      mainWindow: {
        onOpenDialog: (callback: (dialogType: 'edit' | 'ai-modify', itemId: string) => void) => () => void;
      };
      shell: {
        openExternal: (url: string) => Promise<{ success: boolean }>;
        openPath: (path: string) => Promise<{ success: boolean }>;
        showItemInFolder: (path: string) => Promise<{ success: boolean }>;
      };
      clipboard: {
        getHistory: (options?: { limit?: number; offset?: number }) => Promise<ClipboardHistoryResponse>;
        getItem: (id: string) => Promise<ClipboardItem | null>;
        deleteItem: (id: string) => Promise<{ success: boolean }>;
        updateItem: (id: string, updates: Partial<ClipboardItem>) => Promise<ClipboardItem | null>;
        pasteItem: (id: string, options?: { hideWindow?: boolean; simulatePaste?: boolean }) => Promise<{ success: boolean }>;
        search: (filter: SearchFilter) => Promise<ClipboardItem[]>;
        getSettings: () => Promise<Record<string, unknown>>;
        updateSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
        clearHistory: () => Promise<{ success: boolean; deletedCount: number }>;
        clearCategoryItems: (categoryId: string) => Promise<{ success: boolean; deletedCount: number }>;
        onItemAdded: (callback: (item: ClipboardItem) => void) => () => void;
        onItemDeleted: (callback: (id: string) => void) => () => void;
        onItemUpdated: (callback: (item: ClipboardItem) => void) => () => void;
        onItemCategoryChanged: (callback: (data: { itemId: string; categoryIds: string[] }) => void) => () => void;
        duplicateItem: (id: string) => Promise<ClipboardItem | null>;
        getImageData: (imagePath: string) => Promise<{ success: boolean; data: string | null }>;
        aiModify: (itemId: string, instruction: string) => Promise<{ success: boolean; item?: ClipboardItem; error?: string }>;
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
      // Snap (Screenshot Beautification) APIs
      snap: {
        captureRegion: () => Promise<{
          success: boolean;
          imageData?: string;
          width?: number;
          height?: number;
          error?: string;
        }>;
        captureWindow: () => Promise<{
          success: boolean;
          imageData?: string;
          width?: number;
          height?: number;
          error?: string;
        }>;
        getClipboardImage: () => Promise<{
          success: boolean;
          imageData?: string;
          width?: number;
          height?: number;
          error?: string;
        }>;
        copyToClipboard: (imageDataUrl: string) => Promise<{ success: boolean; error?: string }>;
        saveToFile: (
          imageDataUrl: string,
          defaultFilename: string
        ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        onCaptured: (
          callback: (result: {
            success: boolean;
            imageData?: string;
            width?: number;
            height?: number;
            error?: string;
          }) => void
        ) => () => void;
        onNavigate: (callback: () => void) => () => void;
      };
      // Keyboard Shortcuts APIs
      shortcuts: {
        getAll: () => Promise<{
          definitions: Array<{
            id: string;
            label: string;
            description: string;
            defaultShortcut: string;
            category: string;
          }>;
          bindings: Array<{
            action: string;
            shortcut: string;
            enabled: boolean;
            lastError?: string;
          }>;
        }>;
        updateBinding: (action: string, newShortcut: string) => Promise<{ success: boolean; error?: string }>;
        resetToDefault: (action: string) => Promise<{ success: boolean; error?: string }>;
        resetAll: () => Promise<Array<{ action: string; success: boolean; error?: string }>>;
      };
    };
  }
}
