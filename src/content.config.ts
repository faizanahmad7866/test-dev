import { defineCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FEATURE_GROUP_IDS } from '@/data/feature-groups';

/**
 * Product catalogue. Every claim in `tagline`, `description`, `highlights` and `features`
 * must come from the client's packaging or product sheet — see rules.md §6.
 */
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: ({ image }) =>
    z
      .object({
        order: z.number().int(),
        name: z.string(),
        category: z.string(),
        categoryHi: z.string(),
        tagline: z.string().optional(),
        taglineHi: z.string().optional(),
        /** Paragraphs, in the order they are read. */
        description: z.array(z.string()).min(1),
        format: z.string(),
        suitableFor: z.string().optional(),
        /** Claims printed on the front of the pack, quoted as printed. */
        highlights: z.array(z.string()).min(1),
        defaultVariant: z.string(),
        variants: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              /** Pack format as seen in the photography: pouch, bag, wrapped cake. */
              pack: z.string(),
              mrp: z.number().int().positive(),
              image: image(),
              imageAlt: z.string().min(1),
            }),
          )
          .min(1),
        features: z
          .array(
            z.object({
              group: z.enum(FEATURE_GROUP_IDS),
              title: z.string(),
              description: z.string(),
            }),
          )
          .default([]),
      })
      .refine((product) => product.variants.some(({ id }) => id === product.defaultVariant), {
        message: 'defaultVariant must match one of the variant ids',
        path: ['defaultVariant'],
      }),
});

export const collections = { products };

export type Product = CollectionEntry<'products'>;
export type ProductVariant = Product['data']['variants'][number];
export type ProductFeature = Product['data']['features'][number];
