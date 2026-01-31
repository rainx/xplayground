import { describe, it, expect } from 'vitest';
import type {
  ClipboardContentType,
  ClipboardItem,
  Category,
  SearchFilter,
} from '../../src/main/services/clipboard/types';

/**
 * Tests for clipboard type definitions and type guards
 */

describe('ClipboardContentType', () => {
  const validTypes: ClipboardContentType[] = ['text', 'rich_text', 'image', 'file', 'link', 'color'];

  it('should have all expected content types', () => {
    expect(validTypes).toContain('text');
    expect(validTypes).toContain('rich_text');
    expect(validTypes).toContain('image');
    expect(validTypes).toContain('file');
    expect(validTypes).toContain('link');
    expect(validTypes).toContain('color');
  });

  it('should have exactly 6 content types', () => {
    expect(validTypes).toHaveLength(6);
  });
});

describe('ClipboardItem structure', () => {
  const mockItem: ClipboardItem = {
    id: 'test-id-123',
    type: 'text',
    createdAt: new Date().toISOString(),
    sourceApp: { bundleId: 'com.example.app', name: 'Example App' },
    textContent: {
      plainText: 'Hello World',
      characterCount: 11,
      lineCount: 1,
    },
    searchableText: 'Hello World',
    isPinned: false,
    pinboardIds: [],
  };

  it('should have required fields', () => {
    expect(mockItem.id).toBeDefined();
    expect(mockItem.type).toBeDefined();
    expect(mockItem.createdAt).toBeDefined();
    expect(mockItem.searchableText).toBeDefined();
  });

  it('should have correct type for text content', () => {
    expect(mockItem.type).toBe('text');
    expect(mockItem.textContent).toBeDefined();
    expect(mockItem.textContent?.plainText).toBe('Hello World');
  });

  it('should support pinboard associations', () => {
    expect(Array.isArray(mockItem.pinboardIds)).toBe(true);

    const pinnedItem: ClipboardItem = {
      ...mockItem,
      isPinned: true,
      pinboardIds: ['category-1', 'category-2'],
    };

    expect(pinnedItem.pinboardIds).toHaveLength(2);
    expect(pinnedItem.pinboardIds).toContain('category-1');
  });
});

describe('Category structure', () => {
  const mockCategory: Category = {
    id: 'cat-123',
    name: 'Work',
    icon: 'briefcase',
    color: '#3B82F6',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should have required fields', () => {
    expect(mockCategory.id).toBeDefined();
    expect(mockCategory.name).toBeDefined();
    expect(mockCategory.color).toBeDefined();
    expect(mockCategory.order).toBeDefined();
  });

  it('should have valid color format', () => {
    expect(mockCategory.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should allow optional icon', () => {
    const categoryWithoutIcon: Category = {
      ...mockCategory,
      icon: undefined,
    };
    expect(categoryWithoutIcon.icon).toBeUndefined();
  });
});

describe('SearchFilter structure', () => {
  it('should support basic query', () => {
    const filter: SearchFilter = {
      query: 'hello',
    };
    expect(filter.query).toBe('hello');
    expect(filter.contentTypes).toBeUndefined();
  });

  it('should support content type filtering', () => {
    const filter: SearchFilter = {
      query: 'test',
      contentTypes: ['text', 'link'],
    };
    expect(filter.contentTypes).toHaveLength(2);
    expect(filter.contentTypes).toContain('text');
    expect(filter.contentTypes).toContain('link');
  });

  it('should support date range filtering', () => {
    const filter: SearchFilter = {
      query: '',
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31',
      },
    };
    expect(filter.dateRange?.start).toBe('2024-01-01');
    expect(filter.dateRange?.end).toBe('2024-12-31');
  });

  it('should support source app filtering', () => {
    const filter: SearchFilter = {
      query: '',
      sourceApps: ['com.apple.Safari', 'com.google.Chrome'],
    };
    expect(filter.sourceApps).toHaveLength(2);
  });
});
