import type { site } from '@/config/site';

type Address = (typeof site)['company']['office'];

/** One-line postal address in Indian order: "Main Road, Nerpinglai, Amravati, Maharashtra 444707". */
export function formatAddress({ streetAddress, locality, region, postalCode }: Address): string {
  return `${streetAddress}, ${locality}, ${region} ${postalCode}`;
}
