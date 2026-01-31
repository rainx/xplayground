/**
 * Clipboard Manager Types - Main Process
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
  format: 'png' | 'jpeg' | 'gif' | 'tiff' | 'webp';
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

export interface ClipboardManagerSettings {
  maxHistoryItems: number;
  retentionDays: number;
  iCloudSyncEnabled: boolean;
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

export interface CategoryWithCount extends Category {
  itemCount: number;
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

// Native module types (from Rust)
export interface NativeClipboardItem {
  id: string;
  content_type: string;
  created_at: string;
  source_app_bundle_id?: string;
  source_app_name?: string;
  plain_text?: string;
  rtf_data?: string;
  html_data?: string;
  image_data?: number[];
  image_width?: number;
  image_height?: number;
  image_format?: string;
  file_paths?: string[];
  detected_urls?: string[];
}
