import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' → läuft auch in Unterordnern (z. B. GitHub Pages: https://name.github.io/daily-tally/).
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __PWA__: 'true' },
  build: { target: 'es2019', assetsInlineLimit: 0 },
});
