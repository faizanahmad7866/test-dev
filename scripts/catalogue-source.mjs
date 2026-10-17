// The files the product catalogue is printed from, and a fingerprint of them. The print
// script stores the fingerprint beside the PDF; a test compares it with the current files,
// so a product or contact change without a reprint fails the test suite.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PRODUCTS_DIR = 'src/content/products';
const SOURCE_FILES = [
  'src/config/site.ts',
  'src/data/brand-promises.ts',
  'src/data/safety-precautions.ts',
  'src/data/dealer-form-options.ts',
];

export const CATALOGUE_PDF = 'public/downloads/dinar-product-catalogue.pdf';
export const CATALOGUE_STAMP = 'scripts/catalogue-stamp.json';

/** SHA-256 over every catalogue source file, in a fixed order. */
export function catalogueSourceHash(root = process.cwd()) {
  const products = readdirSync(join(root, PRODUCTS_DIR))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(PRODUCTS_DIR, name));
  const hash = createHash('sha256');
  for (const file of [...products, ...SOURCE_FILES]) {
    hash
      .update(file)
      .update('\0')
      .update(readFileSync(join(root, file)))
      .update('\0');
  }
  return hash.digest('hex');
}
