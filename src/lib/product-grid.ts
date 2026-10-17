/**
 * Desktop column count for a row of product cards, chosen so the last row is never a lone
 * card: 4 → 4, 5 → 5, 6 → 3. Returns literal class names so Tailwind generates them.
 */
export function productGridColumns(count: number): string {
  if (count % 4 === 0) return 'lg:grid-cols-4';
  if (count % 3 === 0) return 'lg:grid-cols-3';
  if (count === 5) return 'lg:grid-cols-5';
  return 'lg:grid-cols-4';
}
