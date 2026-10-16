/** Icons that content may reference by name. Add a name here and its import in Icon.astro together. */
export const ICON_NAMES = [
  'check',
  'chevron-down',
  'circle-alert',
  'circle-check',
  'file-text',
  'loader-circle',
  'lock',
  'map-pin',
  'package',
  'phone',
  'phone-call',
  'store',
  'truck',
  'user',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
