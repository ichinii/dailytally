// Migrationskette: TZ=Europe/Berlin node --test tests/
// Pro Kettenschritt gehört hierher ein eigener Block, der nur diesen Schritt
// prüft – unabhängig von allen anderen. Dazu die Invarianten der Kette selbst.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASE_VERSION, DATA_VERSION, STEPS, stepUp } from '../src/lib/migrations.js';
import { upgradeAny, validateCurrent, exportText, parseImport } from '../src/lib/importExport.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const sums = (data) => {
  const out = {};
  for (const e of data.entries) out[e.itemId] = (out[e.itemId] ?? 0) + 1;
  return out;
};

test('Kette ist lückenlos und hat einen Schritt pro Release', () => {
  let prev = BASE_VERSION;
  const releases = new Set();
  for (const step of STEPS) {
    assert.equal(step.to, prev + 1, `Schritt nach ${prev} muss auf ${prev + 1} heben`);
    assert.equal(typeof step.up, 'function');
    assert.equal(typeof step.release, 'string');
    assert.ok(step.release.length, 'Schritt braucht die Release-Nummer');
    assert.ok(!releases.has(step.release), `Release ${step.release} hat mehr als einen Schritt`);
    releases.add(step.release);
    prev = step.to;
  }
  assert.equal(DATA_VERSION, prev, 'DATA_VERSION ist das Ende der Kette');
});

// ---------- Einzelne Schritte ----------
// Beim Anlegen von Schritt N hier einen Block ergänzen:
//   test('Schritt 3 → 4 …', () => { const up = STEPS.find((s) => s.to === 4).up; … });

test('Schritt 3 → 4: neue Felder leer, alles andere unangetastet', () => {
  const up = STEPS.find((s) => s.to === 4).up;
  const res = up({
    version: 3,
    items: [
      { id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01', countGoals: [{ from: '2026-10-01', type: 'max', value: 10 }], pauseGoals: [{ from: '2026-10-01', minutes: 720 }] },
      { id: 'b', label: 'B', period: 'week', createdDay: '2026-10-01', countGoals: [], pauseGoals: [] },
    ],
    entries: [{ id: 'e1', itemId: 'a', day: '2026-10-02', ts: null }],
  });
  assert.equal(res.version, 4);
  for (const it of res.items) {
    assert.deepEqual(it.gapGoals, [], it.id);
    assert.deepEqual(it.pauses, [], it.id);
  }
  assert.deepEqual(res.items[0].countGoals, [{ from: '2026-10-01', type: 'max', value: 10 }]);
  assert.deepEqual(res.items[0].pauseGoals, [{ from: '2026-10-01', minutes: 720 }]);
  assert.deepEqual(res.entries, [{ id: 'e1', itemId: 'a', day: '2026-10-02', ts: null }]);
});

test('Schritt 3 → 4 lässt die Eingabe unverändert', () => {
  const before = { version: 3, items: [{ id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01', countGoals: [], pauseGoals: [] }], entries: [] };
  const copy = structuredClone(before);
  STEPS.find((s) => s.to === 4).up(before);
  assert.deepEqual(before, copy, 'ein Schritt darf nicht in die Vorversion schreiben');
});

// ---------- Ganze Kette ----------
test('ältester Stand läuft durch die ganze Kette', () => {
  const raw = fixture('data-v3');
  const res = upgradeAny(structuredClone(raw));
  assert.equal(res.ok, true, res.error);
  assert.equal(res.format, `v${BASE_VERSION}`);
  assert.equal(res.data.version, DATA_VERSION);
  assert.equal(validateCurrent(res.data).ok, true);
  assert.equal(res.data.items.length, raw.items.length);
  assert.equal(res.data.entries.length, raw.entries.length);
  assert.deepEqual(sums(res.data), sums(raw), 'kein Eintrag darf verloren gehen');
  assert.deepEqual(res.data.items.map((i) => i.id), raw.items.map((i) => i.id), 'Reihenfolge der Items bleibt');
});

test('migrierte Daten sind danach unverändert (Idempotenz)', () => {
  const once = upgradeAny(fixture('data-v3'));
  const twice = upgradeAny(structuredClone(once.data));
  assert.equal(twice.ok, true);
  assert.equal(twice.format, `v${DATA_VERSION}`);
  assert.deepEqual(twice.data, once.data);
});

test('Rundreise über Export und Import', () => {
  const data = upgradeAny(fixture('data-v3')).data;
  const back = parseImport(exportText(data));
  assert.equal(back.ok, true);
  assert.deepEqual(back.data, data);
});

// ---------- Format 4: neue Felder ----------
const item4 = (over = {}) => ({ id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01', countGoals: [], pauseGoals: [], gapGoals: [], pauses: [], ...over });
const data4 = (over = {}) => ({ version: 4, items: [item4(over)], entries: [] });

test('Mindestabstand wird wie das Pausenziel geprüft und sortiert', () => {
  const ok = validateCurrent(data4({ gapGoals: [{ from: '2026-11-01', minutes: null }, { from: '2026-10-01', minutes: 60 }] }));
  assert.equal(ok.ok, true, ok.error);
  assert.deepEqual(ok.data.items[0].gapGoals, [{ from: '2026-10-01', minutes: 60 }, { from: '2026-11-01', minutes: null }]);
  for (const bad of [[{ from: '2026-10-01', minutes: 0 }], [{ from: '2026-10-01', minutes: 1.5 }], [{ from: 'Quatsch', minutes: 60 }], [{ minutes: 60 }]]) {
    assert.equal(validateCurrent(data4({ gapGoals: bad })).ok, false, JSON.stringify(bad));
  }
});

test('Mindestabstand gilt für alle Zeiträume, Pausenziel nur für Tages-Items', () => {
  const woche = validateCurrent({ version: 4, items: [item4({ period: 'week', gapGoals: [{ from: '2026-10-01', minutes: 60 }], pauseGoals: [{ from: '2026-10-01', minutes: 720 }] })], entries: [] });
  assert.equal(woche.ok, true, woche.error);
  assert.deepEqual(woche.data.items[0].gapGoals, [{ from: '2026-10-01', minutes: 60 }]);
  assert.deepEqual(woche.data.items[0].pauseGoals, [], 'Pausenziel wird bei Wochen-Items geräumt');
});

test('Aussetz-Zeiträume: sortiert, ohne Überlappung, offene Pause nur am Ende', () => {
  const ok = validateCurrent(data4({ pauses: [{ from: '2026-11-01', to: null }, { from: '2026-10-05', to: '2026-10-09' }] }));
  assert.equal(ok.ok, true, ok.error);
  assert.deepEqual(ok.data.items[0].pauses, [{ from: '2026-10-05', to: '2026-10-09' }, { from: '2026-11-01', to: null }]);
  const bad = [
    [{ from: '2026-10-09', to: '2026-10-05' }],                                           // Ende vor Beginn
    [{ from: '2026-10-01', to: '2026-10-10' }, { from: '2026-10-10', to: '2026-10-12' }], // Überlappung am Rand
    [{ from: '2026-10-01', to: null }, { from: '2026-11-01', to: null }],                 // zwei offene Pausen
    [{ from: '2026-10-01' }],                                                             // `to` fehlt
    [{ from: '2026-10-01', to: 'Quatsch' }],
  ];
  for (const p of bad) assert.equal(validateCurrent(data4({ pauses: p })).ok, false, JSON.stringify(p));
});

test('fehlende neue Felder gelten als leer', () => {
  const res = validateCurrent({ version: 4, items: [{ id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01' }], entries: [] });
  assert.equal(res.ok, true, res.error);
  assert.deepEqual(res.data.items[0], { id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01', countGoals: [], pauseGoals: [], gapGoals: [], pauses: [] });
});

// ---------- Negativfälle ----------
test('zu neue Daten werden erkannt, nicht umgeformt', () => {
  const res = stepUp({ version: DATA_VERSION + 1, items: [], entries: [] });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'future');
  assert.equal(upgradeAny({ version: 999, items: [], entries: [] }).reason, 'future');
});

test('unbrauchbare Versionsangaben scheitern mit format', () => {
  for (const version of [2.5, '3', null, undefined, BASE_VERSION - 1, NaN]) {
    assert.equal(stepUp({ version, items: [], entries: [] }).ok, false, `version ${String(version)}`);
  }
  assert.equal(upgradeAny({ version: DATA_VERSION }).reason, 'format');
  assert.equal(upgradeAny(null).reason, 'format');
  assert.equal(upgradeAny([]).reason, 'format');
});
