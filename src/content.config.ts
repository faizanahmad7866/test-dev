import { defineCollection, type CollectionEntry } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FEATURE_GROUP_IDS } from '@/data/feature-groups';

/**
 * Product catalogue. Every claim in `tagline`, `description`, `highlights`, `features` and
 * `benefits` must come from the client's packaging, product sheets or ads — see rules.md §6.
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
        /** As printed on the pack, e.g. "24 months from packing". */
        shelfLife: z.string().optional(),
        /**
         * Pack sizes the client sells that have no photo or MRP yet, so no page of their own.
         * Move a size into `variants` once both arrive.
         */
        alsoPackedIn: z.array(z.string()).default([]),
        /**
         * Photo of the back of the pack, shown as a second view beside the pack shot. One
         * back serves every size of a product, since the printed panel is the same.
         */
        packBack: z.object({ image: image(), alt: z.string().min(1) }).optional(),
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
              /**
               * `small` sits the pack smaller in its frame, so a small size that shares a
               * larger pack's photo still reads as the smaller pack.
               */
              photoSize: z.enum(['full', 'small']).default('full'),
              /** Sold online: the pack gets "Shop now" and the WhatsApp order panel on its page. */
              onlineOrder: z.boolean().default(false),
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
        benefits: z.array(z.string()).default([]),
        /**
         * Usage steps from the back of the pack, in order. `image` is a purely visual step
         * photo: the step text sits beside it, so the photo carries no meaning of its own.
         */
        howToUse: z
          .array(z.object({ en: z.string(), hi: z.string().optional(), image: image().optional() }))
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
export type ProductUsageStep = Product['data']['howToUse'][number];
