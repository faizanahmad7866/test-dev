/** Icons that content may reference by name. Add a name here and its import in Icon.astro together. */
export const ICON_NAMES = ['check', 'chevron-down', 'download'] as const;

export type IconName = (typeof ICON_NAMES)[number];
