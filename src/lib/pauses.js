// Aussetzen einzelner Items: Zeiträume, in denen nicht gezählt wird.
// Ausgesetzte Tage fallen aus allen Auswertungen heraus – sie zählen nicht als
// null, sonst würde eine Pause als Erfolg aussehen.
import { keyToNum, numToKey } from './days.js';
import { periodEnd, periodStart } from './goals.js';

/** Der laufende (offene) Aussetz-Zeitraum oder null. Immer der letzte, siehe Prüfung im Import. */
export function openPause(item) {
  const list = item.pauses;
  const last = list && list.length ? list[list.length - 1] : null;
  return last && last.to === null ? last : null;
}

/** Ist dieser Tag (Tagesnummer) ausgesetzt? */
export function isPausedDay(item, day) {
  for (const p of item.pauses || []) {
    if (day < keyToNum(p.from)) return false; // Liste ist sortiert
    if (p.to === null || day <= keyToNum(p.to)) return true;
  }
  return false;
}

/**
 * Wie stark ein Zeitraum ausgesetzt ist: `any` = mindestens ein Tag, `all` = jeder Tag.
 * Ein teilweise ausgesetzter Zeitraum bekommt keine Zielbewertung – ein Wochenziel
 * wäre mit zwei fehlenden Tagen nicht fair zu beurteilen.
 */
export function pausedInPeriod(item, period, day) {
  const a = periodStart(period, day), b = periodEnd(period, day);
  let any = false, all = true;
  for (let d = a; d < b; d++) {
    if (isPausedDay(item, d)) any = true;
    else all = false;
  }
  return { any, all };
}

/** Maske über start..today: 1 = ausgesetzt. Für Reihen und Kennzahlen. */
export function pausedMask(item, start, today) {
  const out = new Uint8Array(Math.max(0, today - start + 1));
  for (const p of item.pauses || []) {
    const from = Math.max(start, keyToNum(p.from));
    const to = p.to === null ? today : Math.min(today, keyToNum(p.to));
    for (let d = from; d <= to; d++) out[d - start] = 1;
  }
  return out;
}

const sorted = (list) => list.slice().sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

/** Fügt einen Zeitraum ein und verschmilzt ihn mit angrenzenden oder überlappenden. */
function merge(list, fromNum, toNum) {
  const add = { from: fromNum, to: toNum };
  const nums = (list || []).map((p) => ({ from: keyToNum(p.from), to: p.to === null ? Infinity : keyToNum(p.to) }));
  const all = [...nums, add].sort((a, b) => a.from - b.from);
  const out = [];
  for (const p of all) {
    const last = out[out.length - 1];
    // +1, damit zwei aneinander grenzende Zeiträume eine Pause werden.
    if (last && p.from <= last.to + 1) last.to = Math.max(last.to, p.to);
    else out.push({ ...p });
  }
  return out.map((p) => ({ from: numToKey(p.from), to: p.to === Infinity ? null : numToKey(p.to) }));
}

/** Setzt genau einen Tag aus. */
export const pauseDay = (item, dayNum) => merge(item.pauses, dayNum, dayNum);

/** Setzt ab heute unbefristet aus. */
export const pauseOpen = (item, fromNum) => merge(item.pauses, fromNum, Infinity);

/** Setzt von heute bis zu einem Tag aus (einschließlich). */
export const pauseUntil = (item, fromNum, toNum) => merge(item.pauses, fromNum, Math.max(fromNum, toNum));

/**
 * Beendet das Aussetzen, sodass `dayNum` wieder zählt: alle Zeiträume, die den
 * Tag enthalten, enden am Vortag. Ein Zeitraum, der dadurch leer wird, fällt weg.
 */
export function resume(item, dayNum) {
  const out = [];
  for (const p of sorted(item.pauses || [])) {
    const from = keyToNum(p.from);
    const to = p.to === null ? Infinity : keyToNum(p.to);
    if (dayNum < from || dayNum > to) { out.push(p); continue; }
    if (from <= dayNum - 1) out.push({ from: p.from, to: numToKey(dayNum - 1) });
    if (to !== Infinity && to >= dayNum + 1) out.push({ from: numToKey(dayNum + 1), to: numToKey(to) });
  }
  return out;
}
