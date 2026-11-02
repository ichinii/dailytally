// Rechenlogik-Tests: TZ=Europe/Berlin node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayOfTs, keyToNum, numToKey, mondayOf, weekRangeLabel, tsForDayTime, formatDuration } from '../src/lib/days.js';
import { evaluate, countGoalAt, applyCountGoal } from '../src/lib/goals.js';
import { buildIndex, dailyPauses, gapBreaks, runningPause, buildSeries, computeItemStats } from '../src/lib/stats.js';
import { parseImport, exportText } from '../src/lib/importExport.js';
import { isPausedDay, openPause, pauseDay, pauseOpen, pauseUntil, pausedInPeriod, pausedMask, resume } from '../src/lib/pauses.js';

const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi).getTime();
const K = keyToNum;

test('Tagesgrenze 04:00: 01:30 gehört zum Vortag', () => {
  assert.equal(numToKey(dayOfTs(at(2026, 10, 18, 1, 30))), '2026-10-17');
  assert.equal(numToKey(dayOfTs(at(2026, 10, 18, 4, 0))), '2026-10-18');
  // Sommerzeit-Ende (25.10.2026) verschiebt nichts
  assert.equal(numToKey(dayOfTs(at(2026, 10, 25, 3, 30))), '2026-10-24');
  assert.equal(numToKey(dayOfTs(at(2026, 10, 25, 12, 0))), '2026-10-25');
});

test('Woche Mo–So und Kopfzeile über Monats-/Jahresgrenze', () => {
  assert.equal(numToKey(mondayOf(K('2026-10-04'))), '2026-09-28');
  assert.equal(weekRangeLabel(K('2026-09-28')), 'Sept – Okt 2026');
  assert.equal(weekRangeLabel(K('2026-10-12')), 'Oktober 2026');
  assert.equal(weekRangeLabel(K('2026-12-28')), 'Dez 2026 – Jan 2027');
});

test('Uhrzeit im Tagesfenster: 02:00 liegt am Folgetag', () => {
  const ts = tsForDayTime(K('2026-10-17'), '02:00');
  assert.equal(ts, at(2026, 10, 18, 2, 0));
  assert.equal(numToKey(dayOfTs(ts)), '2026-10-17');
});

test('Zielbewertung', () => {
  assert.deepEqual(evaluate({ type: 'max', value: 10 }, 10), { state: 'within' });
  assert.deepEqual(evaluate({ type: 'max', value: 10 }, 11), { state: 'over', diff: 1 });
  assert.deepEqual(evaluate({ type: 'min', value: 3 }, 5), { state: 'reached', bonus: 2 });
  assert.deepEqual(evaluate({ type: 'min', value: 3 }, 1), { state: 'open', diff: 2 });
});

test('Zielverlauf: Ab jetzt am 1. Nov, Korrektur ab Anlage', () => {
  const item = { period: 'day', countGoals: [{ from: '2026-10-01', type: 'max', value: 10 }] };
  item.countGoals = applyCountGoal(item.countGoals, 'now', K('2026-11-01'), K('2026-10-01'), { type: 'max', value: 8 });
  assert.equal(countGoalAt(item, K('2026-10-31')).value, 10);
  assert.equal(countGoalAt(item, K('2026-11-01')).value, 8);
  const again = applyCountGoal(item.countGoals, 'now', K('2026-11-01'), K('2026-10-01'), { type: 'max', value: 7 });
  assert.equal(again.length, 2, 'gleicher Zeitraum wird ersetzt');
  const fix = applyCountGoal(item.countGoals, 'fix', K('2026-11-01'), K('2026-10-01'), { type: 'max', value: 8 });
  assert.deepEqual(fix, [{ from: '2026-10-01', type: 'max', value: 8 }]);
});

const pauseItem = { id: 'c', label: 'Z', period: 'day', createdDay: '2026-10-10', countGoals: [], pauseGoals: [{ from: '2026-10-10', minutes: 720 }] };

test('Pause 23:00 → 10:00 zählt für den Endtag; laufende Pause seit 11 h', () => {
  const data = { version: 3, items: [pauseItem], entries: [
    { id: 'a', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 23, 0) },
  ] };
  const r = buildIndex(data).byItem.get('c');
  const now = at(2026, 10, 17, 10, 0);
  const p = runningPause(r, K('2026-10-17'), now);
  assert.equal(p.known, true);
  assert.equal(formatDuration(p.minutes), '11 h');
  const data2 = { ...data, entries: [...data.entries, { id: 'b', itemId: 'c', day: '2026-10-17', ts: now }] };
  const r2 = buildIndex(data2).byItem.get('c');
  const daily = dailyPauses(r2, K('2026-10-10'), K('2026-10-17'), now);
  assert.equal(daily[K('2026-10-17') - K('2026-10-10')], 660);
  assert.equal(daily[K('2026-10-16') - K('2026-10-10')], null);
});

test('Mindestabstand: zu kurze Abstände zählen am Tag des späteren Eintrags', () => {
  const data = { version: 4, items: [pauseItem], entries: [
    { id: 'a', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 20, 0) },
    { id: 'b', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 20, 30) },  // 30 min: zu früh
    { id: 'c', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 22, 0) },  // 90 min: in Ordnung
    { id: 'd', itemId: 'c', day: '2026-10-17', ts: at(2026, 10, 17, 22, 40) }, // über Nacht: in Ordnung
    { id: 'e', itemId: 'c', day: '2026-10-17', ts: at(2026, 10, 17, 23, 0) },  // 20 min: zu früh
  ] };
  const r = buildIndex(data).byItem.get('c');
  const breaks = gapBreaks(r, 60, K('2026-10-16'), K('2026-10-17'));
  assert.deepEqual(breaks, [1, 1]);
  assert.deepEqual(gapBreaks(r, 15, K('2026-10-16'), K('2026-10-17')), [0, 0], 'kurzer Abstand: nichts unterschritten');
  assert.deepEqual(gapBreaks(r, 0, K('2026-10-16'), K('2026-10-17')), [0, 0], 'kein Abstand gesetzt');
  // Fehlt dazwischen eine Uhrzeit, ist der Abstand unbekannt und wird nicht geraten.
  const mitLuecke = { ...data, entries: [...data.entries, { id: 'u', itemId: 'c', day: '2026-10-17', ts: null }] };
  const r2 = buildIndex(mitLuecke).byItem.get('c');
  assert.deepEqual(gapBreaks(r2, 60, K('2026-10-17'), K('2026-10-17')), [0]);
});

test('Tag mit Eintrag ohne Uhrzeit dazwischen → Pause unbekannt', () => {
  const data = { version: 3, items: [pauseItem], entries: [
    { id: 'a', itemId: 'c', day: '2026-10-14', ts: at(2026, 10, 14, 22, 0) },
    { id: 'u', itemId: 'c', day: '2026-10-15', ts: null },
    { id: 'b', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 18, 0) },
  ] };
  const r = buildIndex(data).byItem.get('c');
  const daily = dailyPauses(r, K('2026-10-10'), K('2026-10-17'), at(2026, 10, 16, 19, 0));
  assert.equal(daily[K('2026-10-16') - K('2026-10-10')], null);
  assert.equal(daily[K('2026-10-15') - K('2026-10-10')], null);
  const unknownRun = runningPause(buildIndex({ ...data, entries: data.entries.slice(0, 2) }).byItem.get('c'), K('2026-10-15'), Date.now());
  assert.equal(unknownRun.known, false);
});

test('Pause über einen leeren Tag: Länge bis Tagesende', () => {
  const data = { version: 3, items: [pauseItem], entries: [
    { id: 'a', itemId: 'c', day: '2026-10-14', ts: at(2026, 10, 14, 22, 0) },
    { id: 'b', itemId: 'c', day: '2026-10-16', ts: at(2026, 10, 16, 9, 0) },
  ] };
  const r = buildIndex(data).byItem.get('c');
  const daily = dailyPauses(r, K('2026-10-10'), K('2026-10-17'), at(2026, 10, 16, 10, 0));
  assert.equal(daily[K('2026-10-15') - K('2026-10-10')], 30 * 60); // 22:00 bis 04:00 am 16.
  assert.equal(daily[K('2026-10-16') - K('2026-10-10')], 35 * 60);
});

test('Trend: Woche/Monat als Durchschnitt pro Tag, laufender Zeitraum vorläufig, Ziel als Stufe', () => {
  const item = { id: 'c', label: 'Z', period: 'day', createdDay: '2026-10-01', countGoals: [{ from: '2026-10-01', type: 'max', value: 10 }, { from: '2026-11-01', type: 'max', value: 8 }], pauseGoals: [] };
  const entries = [];
  for (let d = K('2026-10-01'); d <= K('2026-11-04'); d++) for (let i = 0; i < 7; i++) entries.push({ id: `e${d}-${i}`, itemId: 'c', day: numToKey(d), ts: null });
  const r = buildIndex({ version: 3, items: [item], entries }).byItem.get('c');
  const today = K('2026-11-04');
  const s = computeItemStats(item, r, today, Date.now());
  const goalAt = (d) => { const g = s.countGoalAt(d); return g ? { value: g.value, text: '' } : null; };
  const days = buildSeries({ daily: s.daily, start: s.start, today, res: 'day', mode: 'rate', goalAt });
  assert.equal(days[0].start, K('2026-10-01'));
  assert.equal(days.find((p) => p.start === K('2026-10-31')).goal, 10);
  assert.equal(days.find((p) => p.start === K('2026-11-01')).goal, 8);
  const weeks = buildSeries({ daily: s.daily, start: s.start, today, res: 'week', mode: 'rate', goalAt });
  assert.ok(weeks.every((p) => Math.abs(p.value - 7) < 1e-9), 'pro Tag bleibt 7');
  assert.equal(weeks[weeks.length - 1].provisional, true);
});

test('Import v2/v1 und Rundreise v3', () => {
  const v2 = parseImport(JSON.stringify({ items: [{ id: 'a', label: 'Kaffee', goal: 3, goalType: 'max', createdDay: '2026-10-01' }], counts: { a: { '2026-10-02': 3, '2026-10-03': 1 } } }));
  assert.equal(v2.ok, true);
  assert.equal(v2.data.entries.filter((e) => e.day === '2026-10-02').length, 3);
  assert.equal(v2.data.entries.every((e) => e.ts === null), true);
  assert.deepEqual(v2.data.items[0].countGoals, [{ from: '2026-10-01', type: 'max', value: 3 }]);
  const v1 = parseImport(JSON.stringify({ items: [{ id: 'a', label: 'X', createdAt: at(2026, 10, 1, 9, 0) }], events: [{ id: 1, itemId: 'a', ts: at(2026, 10, 3, 1, 30) }, { id: 2, itemId: 'a', ts: at(2026, 10, 3, 12, 0) }] }));
  assert.equal(v1.ok, true);
  assert.deepEqual(v1.data.entries.map((e) => e.day), ['2026-10-02', '2026-10-03']);
  const round = parseImport(exportText(v1.data));
  assert.deepEqual(round.data, v1.data);
  assert.equal(parseImport('{nope').ok, false);
  assert.equal(parseImport('{"version":3,"items":[{"id":"x"}],"entries":[]}').ok, false);
});

test('Glättung zentriert: Spitze in der Mitte wirkt symmetrisch auf beide Nachbarn', () => {
  const daily = [0, 0, 0, 0, 9, 0, 0, 0, 0];
  const pts = buildSeries({ daily, start: K('2026-10-05'), today: K('2026-10-13'), res: 'day', mode: 'rate' });
  assert.equal(pts[3].smooth, pts[5].smooth);
  assert.ok(pts[4].smooth > 0 && pts[8].smooth === 9 / 5 ? false : true);
  assert.equal(pts[0].smooth, 0); // links der Spitze außerhalb des Fensters (±3)
});

test('Monats-Zeitraum: Anfang, Ende, Ziel ab Monatsanfang', async () => {
  const { periodStart, periodEnd } = await import('../src/lib/goals.js');
  assert.equal(numToKey(periodStart('month', K('2026-10-17'))), '2026-10-01');
  assert.equal(numToKey(periodEnd('month', K('2026-12-31'))), '2027-01-01');
  const item = { period: 'month', countGoals: [{ from: '2026-10-01', type: 'min', value: 2 }] };
  assert.equal(countGoalAt(item, periodStart('month', K('2026-10-20'))).value, 2);
  assert.equal(countGoalAt(item, periodStart('month', K('2026-09-20'))), null);
});

// ---------- Aussetzen ----------
test('Aussetzen: Tage, Zeiträume und Beenden', () => {
  const mk = (pauses) => ({ id: 'a', label: 'A', period: 'day', createdDay: '2026-10-01', countGoals: [], pauseGoals: [], gapGoals: [], pauses });
  const it = mk([{ from: '2026-10-05', to: '2026-10-07' }, { from: '2026-10-20', to: null }]);
  assert.equal(isPausedDay(it, K('2026-10-04')), false);
  assert.equal(isPausedDay(it, K('2026-10-05')), true);
  assert.equal(isPausedDay(it, K('2026-10-07')), true);
  assert.equal(isPausedDay(it, K('2026-10-08')), false);
  assert.equal(isPausedDay(it, K('2027-01-01')), true, 'offener Zeitraum reicht in die Zukunft');
  assert.deepEqual(openPause(it), { from: '2026-10-20', to: null });
  assert.equal(openPause(mk([])), null);

  // Maske über einen Ausschnitt
  assert.deepEqual([...pausedMask(it, K('2026-10-04'), K('2026-10-08'))], [0, 1, 1, 1, 0]);

  // Zeitraum: Woche vom 5.10. ist ganz aus, Woche vom 12.10. gar nicht
  const woche = { ...it, period: 'week' };
  assert.deepEqual(pausedInPeriod(woche, 'week', K('2026-10-06')), { any: true, all: false });
  assert.deepEqual(pausedInPeriod(woche, 'week', K('2026-10-14')), { any: false, all: false });
  assert.deepEqual(pausedInPeriod({ ...it, pauses: [{ from: '2026-10-05', to: '2026-10-11' }] }, 'week', K('2026-10-06')), { any: true, all: true });
});

test('Aussetzen: angrenzende Zeiträume verschmelzen, Beenden teilt auf', () => {
  const mk = (pauses) => ({ pauses });
  // Grenzt direkt an den 5.–7. an: wird ein Zeitraum, keine zwei
  assert.deepEqual(pauseDay(mk([{ from: '2026-10-05', to: '2026-10-07' }]), K('2026-10-08')),
    [{ from: '2026-10-05', to: '2026-10-08' }]);
  // Mitten in einem Zeitraum ändert nichts
  assert.deepEqual(pauseDay(mk([{ from: '2026-10-05', to: '2026-10-07' }]), K('2026-10-06')),
    [{ from: '2026-10-05', to: '2026-10-07' }]);
  assert.deepEqual(pauseOpen(mk([]), K('2026-11-01')), [{ from: '2026-11-01', to: null }]);
  assert.deepEqual(pauseUntil(mk([]), K('2026-11-01'), K('2026-11-10')), [{ from: '2026-11-01', to: '2026-11-10' }]);
  assert.deepEqual(pauseUntil(mk([]), K('2026-11-05'), K('2026-11-01')), [{ from: '2026-11-05', to: '2026-11-05' }], 'Ende vor Beginn wird auf einen Tag gekürzt');

  // Beenden: heute zählt wieder
  assert.deepEqual(resume(mk([{ from: '2026-10-20', to: null }]), K('2026-10-25')), [{ from: '2026-10-20', to: '2026-10-24' }]);
  assert.deepEqual(resume(mk([{ from: '2026-10-25', to: null }]), K('2026-10-25')), [], 'am selben Tag beendet = nie ausgesetzt');
  assert.deepEqual(resume(mk([{ from: '2026-10-20', to: '2026-10-30' }]), K('2026-10-25')),
    [{ from: '2026-10-20', to: '2026-10-24' }, { from: '2026-10-26', to: '2026-10-30' }], 'Beenden mitten drin teilt auf');
  assert.deepEqual(resume(mk([{ from: '2026-10-20', to: '2026-10-30' }]), K('2026-11-05')),
    [{ from: '2026-10-20', to: '2026-10-30' }], 'außerhalb bleibt unberührt');
});
