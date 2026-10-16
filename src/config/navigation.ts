/** Header navigation. Array order is render order on desktop and in the mobile menu. */
export interface NavItem {
  label: string;
  href: string;
}

export const primaryNav = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products/' },
  { label: 'Dealership', href: '/dealership/' },
  { label: 'Contact', href: '/contact/' },
] as const satisfies readonly NavItem[];

export const headerCta = {
  label: 'Become a Dealer',
  href: '/dealership/',
} as const satisfies NavItem;
