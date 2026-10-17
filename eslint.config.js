import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', '.astro/', '.wrangler/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-strict'],
  {
    // Build scripts run in Node, outside Astro and the browser.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        WebSocket: 'readonly',
      },
    },
  },
);
