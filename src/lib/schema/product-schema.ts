import { getImage } from 'astro:assets';
import { site } from '@/config/site';
import { skuName, skuPath, type ProductSku } from '@/lib/product-skus';

const BRAND = { '@type': 'Brand', name: site.name } as const;
const MANUFACTURER = { '@type': 'Organization', name: site.company.legalName } as const;
const SCHEMA_IMAGE_WIDTH = 1200;

type Schema = Record<string, unknown>;

function breadcrumb(siteUrl: string, trail: { name: string; path: string }[]): Schema {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: new URL(path, siteUrl).href,
    })),
  };
}

/** One pack as a schema.org Product with its MRP as the offer. Image URLs are absolute, as Google requires. */
async function productNode(sku: ProductSku, siteUrl: string): Promise<Schema> {
  const { data } = sku.product;
  const url = new URL(skuPath(sku), siteUrl).href;
  // Front shot first: search engines treat the first image as the product's main photo.
  const photos = [sku.variant.image, ...(data.packBack ? [data.packBack.image] : [])];
  const images = await Promise.all(
    photos.map((src) => getImage({ src, width: SCHEMA_IMAGE_WIDTH, format: 'jpg' })),
  );

  return {
    '@type': 'Product',
    '@id': url,
    url,
    name: skuName(sku),
    description: data.description.join(' '),
    category: data.category,
    brand: BRAND,
    manufacturer: MANUFACTURER,
    image: images.map(({ src }) => new URL(src, siteUrl).href),
    offers: {
      '@type': 'Offer',
      price: sku.variant.mrp,
      priceCurrency: 'INR',
      url,
    },
  };
}

/** JSON-LD for the products list: the breadcrumb trail plus every pack, each pointing at its own page. */
export function buildProductListSchema(skus: ProductSku[], siteUrl: string): Schema {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(siteUrl, [
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products/' },
      ]),
      {
        '@type': 'ItemList',
        itemListElement: skus.map((sku, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: new URL(skuPath(sku), siteUrl).href,
        })),
      },
    ],
  };
}

/** JSON-LD for one pack's detail page: breadcrumb trail plus the full Product. */
export async function buildProductPageSchema(sku: ProductSku, siteUrl: string): Promise<Schema> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(siteUrl, [
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products/' },
        { name: skuName(sku), path: skuPath(sku) },
      ]),
      await productNode(sku, siteUrl),
    ],
  };
}
