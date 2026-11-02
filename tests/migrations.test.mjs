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

test('ohne Formatwechsel ist die Kette leer', () => {
  // Erinnerung an die Squash-Regel: Diese Zusicherung fällt beim ersten
  // echten Schritt weg und wird durch Schritt-Blöcke ersetzt.
  assert.equal(DATA_VERSION, BASE_VERSION + STEPS.length);
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
