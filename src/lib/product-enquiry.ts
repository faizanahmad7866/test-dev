// Relative, not `@/`: Vitest runs this module without Astro's path aliases.
import { formatMrp } from './format-mrp';

interface EnquiryPack {
  /** Product and size as the site names it, e.g. "Dinar Super Wash 5 kg". */
  name: string;
  /** Pack format, e.g. "Bag". */
  pack: string;
  mrp: number;
}

/**
 * WhatsApp text for a product enquiry: which pack and its MRP, so the team knows what is
 * asked about, then an opening line the visitor can edit before pressing Send.
 */
export function buildProductEnquiryMessage({ name, pack, mrp }: EnquiryPack): string {
  return [
    `*Product enquiry - ${name}*`,
    `${pack}, MRP ${formatMrp(mrp)}`,
    '',
    'Hi, I would like to know more about this product.',
  ].join('\n');
}
