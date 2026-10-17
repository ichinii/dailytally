// Testdaten: 2 Jahre, 5 Items. TZ=Europe/Berlin node seed.mjs > seed.json
const MS = 86400000;
const keyOf = (n) => new Date(n * MS).toISOString().slice(0, 10);
const numOf = (k) => Math.round(Date.UTC(+k.slice(0,4), +k.slice(5,7)-1, +k.slice(8,10)) / MS);
const dayOfTs = (ts) => { const d = new Date(ts); let n = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS); if (d.getHours() < 4) n--; return n; };
const now = Date.now();
const today = dayOfTs(now);
const start = today - 730;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const at = (n, h, m) => { const k = keyOf(n); return new Date(+k.slice(0,4), +k.slice(5,7)-1, +k.slice(8,10), h, m).getTime(); };
const mon = (n) => n - ((((n + 3) % 7) + 7) % 7);
const items = [
  { id: 'c1', label: 'Zigaretten', period: 'day', createdDay: keyOf(start), countGoals: [{ from: keyOf(start), type: 'max', value: 10 }, { from: keyOf(today - 60), type: 'max', value: 8 }], pauseGoals: [{ from: keyOf(start + 300), minutes: 720 }] },
  { id: 's1', label: 'Sport', period: 'week', createdDay: keyOf(start), countGoals: [{ from: keyOf(mon(start)), type: 'min', value: 3 }], pauseGoals: [] },
  { id: 'w1', label: 'Gläser Wasser', period: 'day', createdDay: keyOf(start), countGoals: [{ from: keyOf(start), type: 'min', value: 8 }], pauseGoals: [] },
  { id: 'k1', label: 'Kaffee', period: 'day', createdDay: keyOf(start + 100), countGoals: [{ from: keyOf(start + 100), type: 'max', value: 3 }], pauseGoals: [] },
  { id: 'b1', label: 'Bücher gelesen', period: 'week', createdDay: keyOf(start + 200), countGoals: [], pauseGoals: [] },
];
const entries = []; let id = 0;
const add = (itemId, n, ts) => entries.push({ id: 'e' + (id++).toString(36), itemId, day: keyOf(n), ts });
for (let n = start; n <= today; n++) {
  const t = (n - start) / 730;
  const cig = Math.max(0, Math.round(12 - t * 5 + (rnd() - 0.5) * 6));
  let h = 8 + rnd() * 2;
  for (let i = 0; i < cig; i++) { const ts = at(n, Math.floor(h), Math.floor((h % 1) * 60)); if (ts < now) add('c1', n, (rnd() < 0.05 ? null : ts)); h += 14 / Math.max(cig, 1) * (0.6 + rnd() * 0.8); if (h >= 27) break; }
  if (rnd() < 0.45) { const ts = at(n, 17 + Math.floor(rnd() * 3), Math.floor(rnd() * 60)); if (ts < now) add('s1', n, ts); }
  const w = Math.round(6 + rnd() * 4);
  for (let i = 0; i < w; i++) { const ts = at(n, 7 + i, Math.floor(rnd() * 60)); if (ts < now) add('w1', n, rnd() < 0.3 ? null : ts); }
  if (n >= start + 100) { const k = Math.round(1 + rnd() * 3); for (let i = 0; i < k; i++) { const ts = at(n, 7 + i * 3, Math.floor(rnd() * 60)); if (ts < now) add('k1', n, ts); } }
  if (n >= start + 200 && rnd() < 0.12) add('b1', n, null);
}
console.log(JSON.stringify({ version: 3, items, entries }));
