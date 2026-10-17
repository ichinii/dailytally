// Zielverlauf und Zielbewertung.
import { keyToNum, numToKey, mondayOf, monthStartOf, nextMonthStart } from './days.js';

export const PERIODS = ['day', 'week', 'month'];

/** Beginn des Zeitraums (Tagesnummer), in dem Tag n liegt: der Tag, der Montag bzw. der Monatserste. */
export const periodStart = (period, n) => (period === 'week' ? mondayOf(n) : period === 'month' ? monthStartOf(n) : n);

/** Ende (exklusiv) des Zeitraums, in dem Tag n liegt. */
export const periodEnd = (period, n) => (period === 'week' ? mondayOf(n) + 7 : period === 'month' ? nextMonthStart(n) : n + 1);

/**
 * Ziel, das für einen Zeitraum gilt, der am Tag `startNum` beginnt:
 * der letzte Eintrag, dessen `from` am oder vor dem Beginn liegt. Liefert null bei "kein Ziel".
 */
export function entryAt(list, startNum) {
  let found = null;
  for (const g of list) {
    if (keyToNum(g.from) <= startNum) found = g;
    else break;
  }
  return found;
}

export function countGoalAt(item, startNum) {
  const g = entryAt(item.countGoals, startNum);
  return g && g.value != null ? { type: g.type, value: g.value } : null;
}

export function pauseGoalAt(item, startNum) {
  const g = entryAt(item.pauseGoals, startNum);
  return g && g.minutes != null ? g.minutes : null;
}

/**
 * Bewertung eines Werts gegen ein Zählziel.
 * max: ≤ N im Rahmen, > N überschritten (um diff). min: < N offen (diff fehlt), ≥ N erreicht (bonus).
 */
export function evaluate(goal, value) {
  if (!goal) return { state: 'none' };
  if (goal.type === 'max') {
    return value <= goal.value ? { state: 'within' } : { state: 'over', diff: value - goal.value };
  }
  return value < goal.value ? { state: 'open', diff: goal.value - value } : { state: 'reached', bonus: value - goal.value };
}

const sameCount = (a, b) => (a == null && b == null) || (a && b && a.type === b.type && a.value === b.value);

export function countGoalChanged(item, startNum, next) {
  return !sameCount(countGoalAt(item, startNum), next);
}
export function pauseGoalChanged(item, startNum, nextMinutes) {
  return (pauseGoalAt(item, startNum) ?? null) !== (nextMinutes ?? null);
}

const sortByFrom = (list) => list.slice().sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

/**
 * "Ab jetzt": hängt einen Eintrag ab `fromNum` an (ersetzt einen vorhandenen mit gleichem `from`).
 * "Korrektur": ersetzt den ganzen Verlauf durch einen Eintrag ab Anlage.
 */
export function applyCountGoal(list, mode, fromNum, createdStartNum, next) {
  const entry = (from) => ({ from: numToKey(from), type: next ? next.type : null, value: next ? next.value : null });
  if (mode === 'fix') return next ? [entry(createdStartNum)] : [];
  if (!next && list.length === 0) return [];
  const key = numToKey(fromNum);
  return sortByFrom([...list.filter((g) => g.from !== key), entry(fromNum)]);
}

export function applyPauseGoal(list, mode, fromNum, createdStartNum, nextMinutes) {
  const entry = (from) => ({ from: numToKey(from), minutes: nextMinutes ?? null });
  if (mode === 'fix') return nextMinutes != null ? [entry(createdStartNum)] : [];
  if (nextMinutes == null && list.length === 0) return [];
  const key = numToKey(fromNum);
  return sortByFrom([...list.filter((g) => g.from !== key), entry(fromNum)]);
}
