import { getImage } from 'astro:assets';
import type { Product } from '@/content.config';

const BRAND = { '@type': 'Brand', name: 'Dinar' } as const;
const SCHEMA_IMAGE_WIDTH = 1200;

/**
 * JSON-LD for the products page: the breadcrumb trail plus every product, each with
 * one Offer per pack size priced at its MRP. Image URLs are absolute, as Google requires.
 */
export async function buildProductsPageSchema(
  products: Product[],
  pageUrl: URL,
): Promise<Record<string, unknown>> {
  const productNodes = await Promise.all(
    products.map(async ({ id, data }) => {
      const productUrl = new URL(`#${id}`, pageUrl).href;
      const images = await Promise.all(
        data.variants.map(async ({ image }) => {
          const built = await getImage({ src: image, width: SCHEMA_IMAGE_WIDTH, format: 'jpg' });
          return new URL(built.src, pageUrl).href;
        }),
      );

      return {
        '@type': 'Product',
        '@id': productUrl,
        name: data.name,
        description: data.description.join(' '),
        category: data.category,
        brand: BRAND,
        image: images,
        offers: data.variants.map((variant) => ({
          '@type': 'Offer',
          name: `${data.name} ${variant.label}`,
          price: variant.mrp,
          priceCurrency: 'INR',
          url: productUrl,
        })),
      };
    }),
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', pageUrl).href },
          { '@type': 'ListItem', position: 2, name: 'Products', item: pageUrl.href },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: productNodes.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item,
        })),
      },
    ],
  };
}
