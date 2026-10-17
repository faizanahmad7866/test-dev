import { describe, expect, it } from 'vitest';
import { productGridColumns } from './product-grid';

describe('productGridColumns', () => {
  it('fills whole rows for common counts', () => {
    expect(productGridColumns(3)).toBe('lg:grid-cols-3');
    expect(productGridColumns(4)).toBe('lg:grid-cols-4');
    expect(productGridColumns(5)).toBe('lg:grid-cols-5');
    expect(productGridColumns(6)).toBe('lg:grid-cols-3');
    expect(productGridColumns(8)).toBe('lg:grid-cols-4');
  });
});
