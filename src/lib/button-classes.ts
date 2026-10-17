/**
 * The site's pill buttons as class lists, shared by link buttons (Button.astro) and real
 * <button>s that open panels, so both look and behave the same.
 * - primary: brand-700, not the logo red, so white label text clears WCAG AA.
 * - navy: the logo navy, for product and browsing actions.
 * - light: white pill for red or navy backgrounds.
 * - outline: pill with a border in the surrounding text colour (works on light and dark).
 */
export type ButtonVariant = 'primary' | 'navy' | 'light' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:translate-y-px motion-reduce:transition-none';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  navy: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950',
  light: 'bg-white text-navy-900 hover:bg-mist-50 active:bg-mist-100',
  outline:
    'border-2 border-current/25 hover:border-current/60 hover:bg-current/5 active:bg-current/10',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
}
