import type { ProductVariant } from '@/content.config';

/**
 * How large a pack photo may grow inside its frame: the full frame, or three fifths of it
 * for packs marked `photoSize: 'small'`. Literal class names, so Tailwind generates them.
 */
export function packPhotoFit({ photoSize }: Pick<ProductVariant, 'photoSize'>): string {
  return photoSize === 'small' ? 'max-h-3/5 max-w-3/5' : 'max-h-full max-w-full';
}
