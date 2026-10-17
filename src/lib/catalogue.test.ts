import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_PDF,
  CATALOGUE_STAMP,
  catalogueSourceHash,
} from '../../scripts/catalogue-source.mjs';
import { catalogueEdition } from './catalogue';

describe('product catalogue PDF', () => {
  it('is printed from the current product and contact data', () => {
    expect(existsSync(CATALOGUE_PDF), 'Run `pnpm catalogue` to print the PDF').toBe(true);
    const stamp = JSON.parse(readFileSync(CATALOGUE_STAMP, 'utf8')) as { sourceHash: string };
    expect(stamp.sourceHash, 'Product or contact data changed: run `pnpm catalogue`').toBe(
      catalogueSourceHash(),
    );
  });
});

describe('catalogueEdition', () => {
  it('names the month and year', () => {
    expect(catalogueEdition(new Date(2026, 9, 17))).toBe('October 2026');
  });
});
