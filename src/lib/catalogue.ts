import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Where the printed catalogue is published, relative to the site root. */
export const CATALOGUE_HREF = '/downloads/dinar-product-catalogue.pdf';

/**
 * The catalogue link with its file size ("PDF, 2.1 MB"), read from public/ at build time.
 * The size is left out when the PDF has not been generated yet (`pnpm catalogue`).
 */
export function getCatalogueDownload(): { href: string; label: string } {
  const file = join(process.cwd(), 'public', CATALOGUE_HREF);
  if (!existsSync(file)) return { href: CATALOGUE_HREF, label: 'PDF' };
  const megabytes = statSync(file).size / 1_000_000;
  return { href: CATALOGUE_HREF, label: `PDF, ${megabytes.toFixed(1)} MB` };
}

/** The catalogue's edition, e.g. "October 2026": the month it was printed. */
export function catalogueEdition(date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}
