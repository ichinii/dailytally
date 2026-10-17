// Baut Daily Tally ohne Vite mit esbuild (esbuild kommt mit Vite mit).
//   node scripts/build-single.mjs            → dist-single/index.html (eine Datei, ohne Service Worker; für Vorschauen/iframes)
//   node scripts/build-single.mjs --artifact → dist-single/artifact.html (Seiteninhalt für eine claude.ai-Vorschau)
//   node scripts/build-single.mjs --pwa      → dist-pwa/ (wie `vite build`: index.html, assets/, sw.js, Manifest)
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pwa = process.argv.includes('--pwa');
const artifact = process.argv.includes('--artifact');
const outdir = join(root, pwa ? 'dist-pwa' : 'dist-single');
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const res = await build({
  entryPoints: [join(root, 'src/main.jsx')],
  bundle: true, minify: true, write: false, format: 'iife', target: 'es2019',
  jsx: 'automatic', outdir: join(outdir, 'assets'),
  entryNames: pwa ? 'app-[hash]' : 'app', assetNames: '[name]-[hash]',
  loader: { '.woff': pwa ? 'file' : 'dataurl', '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"', __PWA__: pwa ? 'true' : 'false' },
  publicPath: '.', // relativ zur CSS-Datei in assets/
  legalComments: 'none',
});

const files = res.outputFiles;
const js = files.find((f) => f.path.endsWith('.js'));
const css = files.find((f) => f.path.endsWith('.css'));
const escScript = (s) => s.replace(/<\/script/gi, '<\\/script');
const escStyle = (s) => s.replace(/<\/style/gi, '<\\/style');

if (pwa) {
  mkdirSync(join(outdir, 'assets'), { recursive: true });
  for (const f of files) writeFileSync(f.path, f.contents);
  cpSync(join(root, 'public'), outdir, { recursive: true });
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  html = html.replace('<script type="module" src="/src/main.jsx"></script>', `<script defer src="./assets/${basename(js.path)}"></script>`);
  html = html.replace('</head>', `    <link rel="stylesheet" href="./assets/${basename(css.path)}" />\n  </head>`);
  writeFileSync(join(outdir, 'index.html'), html);
  console.log('dist-pwa/', readdirSync(join(outdir, 'assets')).join(', '));
} else if (artifact) {
  // Die claude.ai-Vorschau legt doctype/head/body selbst an.
  const page = `<title>Daily Tally</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${escStyle(css.text)}</style>
<div id="root"></div>
<script>${escScript(js.text)}</script>
`;
  writeFileSync(join(outdir, 'artifact.html'), page);
  console.log('dist-single/artifact.html', (page.length / 1024).toFixed(0), 'KB');
} else {
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Daily Tally</title>
<style>${escStyle(css.text)}</style>
</head>
<body>
<div id="root"></div>
<script>${escScript(js.text)}</script>
</body>
</html>
`;
  writeFileSync(join(outdir, 'index.html'), html);
  console.log('dist-single/index.html', (html.length / 1024).toFixed(0), 'KB');
}
