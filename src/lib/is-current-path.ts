/**
 * Whether a nav link points at the page being rendered.
 * Home matches exactly; every other link also matches its child pages (/products/ on /products/super-wash/).
 */
export function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}
