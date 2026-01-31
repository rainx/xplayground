import { describe, it, expect } from 'vitest';

/**
 * Tests for clipboard popup navigation logic
 * These test the pure navigation functions without React/Electron dependencies
 */

// Navigation logic extracted for testing
function calculateNewIndex(
  direction: 'left' | 'right' | 'up' | 'down',
  currentIndex: number,
  totalItems: number
): number {
  if (totalItems === 0) return -1;

  if (direction === 'left' || direction === 'up') {
    return currentIndex <= 0 ? totalItems - 1 : currentIndex - 1;
  } else {
    return currentIndex >= totalItems - 1 ? 0 : currentIndex + 1;
  }
}

describe('Clipboard Popup Navigation', () => {
  describe('calculateNewIndex', () => {
    it('should return -1 when no items', () => {
      expect(calculateNewIndex('right', 0, 0)).toBe(-1);
      expect(calculateNewIndex('left', 0, 0)).toBe(-1);
    });

    it('should move right correctly', () => {
      expect(calculateNewIndex('right', 0, 5)).toBe(1);
      expect(calculateNewIndex('right', 2, 5)).toBe(3);
      expect(calculateNewIndex('down', 1, 5)).toBe(2);
    });

    it('should move left correctly', () => {
      expect(calculateNewIndex('left', 2, 5)).toBe(1);
      expect(calculateNewIndex('left', 4, 5)).toBe(3);
      expect(calculateNewIndex('up', 3, 5)).toBe(2);
    });

    it('should wrap around when moving right past last item', () => {
      expect(calculateNewIndex('right', 4, 5)).toBe(0);
      expect(calculateNewIndex('down', 4, 5)).toBe(0);
    });

    it('should wrap around when moving left past first item', () => {
      expect(calculateNewIndex('left', 0, 5)).toBe(4);
      expect(calculateNewIndex('up', 0, 5)).toBe(4);
    });

    it('should handle single item list', () => {
      expect(calculateNewIndex('right', 0, 1)).toBe(0);
      expect(calculateNewIndex('left', 0, 1)).toBe(0);
    });

    it('should handle starting from no selection (-1)', () => {
      // When currentIndex is -1 (no selection), moving right should go to 0
      expect(calculateNewIndex('right', -1, 5)).toBe(0);
      // Moving left from -1 should wrap to last item
      expect(calculateNewIndex('left', -1, 5)).toBe(4);
    });
  });
});

describe('Popup Keyboard Shortcuts', () => {
  const popupShortcuts = ['Escape', 'Left', 'Right', 'Up', 'Down', 'Return', 'Enter'];

  it('should have all required shortcuts defined', () => {
    expect(popupShortcuts).toContain('Escape');
    expect(popupShortcuts).toContain('Left');
    expect(popupShortcuts).toContain('Right');
    expect(popupShortcuts).toContain('Return');
  });

  it('should include both Enter and Return for compatibility', () => {
    expect(popupShortcuts).toContain('Enter');
    expect(popupShortcuts).toContain('Return');
  });

  it('should have exactly 7 shortcuts', () => {
    expect(popupShortcuts).toHaveLength(7);
  });
});
