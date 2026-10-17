import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { site } from './src/config/site.ts';

export default defineConfig({
  site: site.url,
  trailingSlash: 'always',
  env: {
    schema: {
      // Public by design: Turnstile site keys are meant to ship in the page.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public' }),
    },
  },
  // One type family in three cuts: Plex Sans for text, Plex Sans Devanagari for Hindi
  // (drawn to match it), Plex Mono for figures such as MRPs and pack codes.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      weights: ['300 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Sans Devanagari',
      cssVariable: '--font-plex-devanagari',
      weights: [500, 600],
      styles: ['normal'],
      subsets: ['devanagari'],
      // Devanagari only, and no fallbacks: Latin text skips straight to Plex Sans, and the
      // file is never downloaded on a page without Hindi.
      unicodeRange: ['U+0900-097F', 'U+1CD0-1CFF', 'U+A8E0-A8FF', 'U+200C-200D', 'U+25CC'],
      fallbacks: [],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the form's validator at startup. Found later, mid-session, Vite re-bundles
    // it and the open page keeps requesting the stale copy (504), so the form script never runs.
    optimizeDeps: { include: ['zod/mini'] },
  },
});
