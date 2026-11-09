import { defineConfig } from 'astro/config';

// Local development defaults to /. Pages supplies the real origin and base path.
const site = process.env.PAGES_SITE;
const rawBase = process.env.PAGES_BASE || '/';
const base = `/${rawBase.replace(/^\/+|\/+$/g, '')}${rawBase === '/' ? '' : '/'}`;

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  ...(site ? { site } : {}),
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
});
