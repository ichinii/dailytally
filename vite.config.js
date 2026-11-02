import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './' → läuft auch in Unterordnern (z. B. GitHub Pages: https://name.github.io/daily-tally/).
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __PWA__: 'true', __VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2019', assetsInlineLimit: 0 },
});
