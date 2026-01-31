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
        clearHistory: () => Promise<{ success: boolean }>;
        onItemAdded: (callback: (item: ClipboardItem) => void) => () => void;
        onItemDeleted: (callback: (id: string) => void) => () => void;
      };
    };
  }
}
