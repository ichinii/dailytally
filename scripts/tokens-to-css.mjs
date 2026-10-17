// Erzeugt src/styles/tokens.css aus dem Kladde-Designsystem (src/design/tokens.json).
// Aufruf: node scripts/tokens-to-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(readFileSync(join(root, 'src/design/tokens.json'), 'utf8'));

const themes = t.color.themes.map((th) => th.id);
const first = themes[0];
const valueIn = (tok, theme) => {
  const v = tok.value;
  if (typeof v === 'string') return v;
  return v[theme] ?? v[first];
};
const resolve = (v) => {
  const m = /^\{(.+)\}$/.exec(v);
  return m ? `var(--${m[1]})` : v;
};

const lines = (theme) => {
  const out = [];
  for (const tok of t.color.tokens) out.push(`  --${tok.name}: ${resolve(valueIn(tok, theme))};`);
  for (const tok of t.shadow.tokens) out.push(`  --${tok.name}: ${valueIn(tok, theme)};`);
  return out;
};

const fixed = [];
for (const fam of ['spacing', 'radius', 'stroke', 'tilt']) {
  for (const tok of t[fam].tokens) fixed.push(`  --${tok.name}: ${tok.value};`);
}
for (const [name, stack] of Object.entries(t.type.families)) fixed.push(`  --font-${name}: ${stack};`);
for (const g of t.type.groups) {
  for (const s of g.styles) {
    fixed.push(`  --${s.name}-size: ${s.fontSize};`);
    fixed.push(`  --${s.name}-line: ${s.lineHeight};`);
    fixed.push(`  --${s.name}-weight: ${s.fontWeight};`);
  }
}

const css = `/* ${t.name} — generated from tokens.json (scripts/tokens-to-css.mjs). Nicht von Hand ändern. */
:root {
${lines('light').join('\n')}
${fixed.join('\n')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${lines('dark').map((l) => '  ' + l).join('\n')}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${lines('dark').join('\n')}
  color-scheme: dark;
}
`;
writeFileSync(join(root, 'src/styles/tokens.css'), css);
console.log('tokens.css geschrieben');
