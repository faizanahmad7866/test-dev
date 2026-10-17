import type { ImageMetadata } from 'astro';
import cleaning from '@/assets/products/features/cleaning.jpg';
import everyday from '@/assets/products/features/everyday.jpg';
import fabricCare from '@/assets/products/features/fabric-care.jpg';
import type { FeatureGroupId } from '@/data/feature-groups';

/**
 * The client's photo for each feature group, shown in a circle beside the group's name.
 * Kept apart from feature-groups.ts, which the content config imports and should stay free
 * of image imports.
 */
export const FEATURE_GROUP_VISUALS = {
  cleaning,
  care: fabricCare,
  everyday,
} as const satisfies Record<FeatureGroupId, ImageMetadata>;
