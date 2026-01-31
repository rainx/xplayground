import { describe, it, expect } from 'vitest';

describe('Example test suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should demonstrate async testing', async () => {
    const result = await Promise.resolve('hello');
    expect(result).toBe('hello');
  });
});
