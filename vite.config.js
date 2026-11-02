import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './' → läuft auch in Unterordnern (z. B. GitHub Pages: https://name.github.io/daily-tally/).
// __PWA__ nur beim Bauen: am Entwicklungsserver würde der Service Worker die
// Module von Vite abfangen und ausgeliefertes Altmaterial zurückgeben – das
// Neuladen schlägt dann fehl, nur ein erzwungenes Neuladen kommt durch.
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react()],
  define: { __PWA__: JSON.stringify(command === 'build'), __VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2019', assetsInlineLimit: 0 },
}));
