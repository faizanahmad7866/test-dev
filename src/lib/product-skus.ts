import type { Product, ProductVariant } from '@/content.config';

/** One pack of one product, e.g. Dinar Super Wash 500 g. Every pack has its own detail page. */
export interface ProductSku {
  slug: string;
  product: Product;
  variant: ProductVariant;
}

/** Every pack of every product, in catalogue order: by product `order`, then pack order in its file. */
export function listSkus(products: Product[]): ProductSku[] {
  return [...products]
    .sort((a, b) => a.data.order - b.data.order)
    .flatMap((product) =>
      product.data.variants.map((variant) => ({
        slug: `${product.id}-${variant.id}`,
        product,
        variant,
      })),
    );
}

/** URL of a pack's detail page, e.g. "/products/super-wash-500g/". */
export function skuPath(sku: ProductSku): string {
  return `/products/${sku.slug}/`;
}

/** Display name of a pack, e.g. "Dinar Super Wash 500 g". */
export function skuName(sku: ProductSku): string {
  return `${sku.product.data.name} ${sku.variant.label}`;
}
