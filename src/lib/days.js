// Datumsrechnung über Tagesnummern (Tage seit 1970-01-01, UTC-basiert).
// Nur `ts` (echter Zeitpunkt) wird in Ortszeit umgerechnet. Die 4-Uhr-Grenze ist nur hier definiert.
import { MONTHS, MONTHS_SHORT, WEEKDAYS_SHORT } from '../strings.js';

export const DAY_START_HOUR = 4;
const MS_DAY = 86400000;

export function keyToNum(key) {
  const y = +key.slice(0, 4), m = +key.slice(5, 7), d = +key.slice(8, 10);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

const pad = (n) => (n < 10 ? '0' + n : '' + n);

export function numToYMD(n) {
  const dt = new Date(n * MS_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function numToKey(n) {
  const { y, m, d } = numToYMD(n);
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function isValidKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return numToKey(keyToNum(key)) === key;
}

/** Tag (Nummer), zu dem ein Zeitpunkt gehört: 01:30 Ortszeit zählt zum Vortag. */
export function dayOfTs(ts) {
  const d = new Date(ts);
  let n = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DAY);
  if (d.getHours() < DAY_START_HOUR) n -= 1;
  return n;
}

/** Beginn des Tages n (04:00 Ortszeit) als Zeitstempel. */
export function dayStartTs(n) {
  const { y, m, d } = numToYMD(n);
  return new Date(y, m - 1, d, DAY_START_HOUR, 0, 0, 0).getTime();
}

/** Ende des Tages n (exklusiv) = Beginn des Folgetags. */
export const dayEndTs = (n) => dayStartTs(n + 1);

/** 0 = Montag … 6 = Sonntag */
export const weekdayOf = (n) => (((n + 3) % 7) + 7) % 7;
export const mondayOf = (n) => n - weekdayOf(n);

export function monthStartOf(n) {
  const { y, m } = numToYMD(n);
  return Math.round(Date.UTC(y, m - 1, 1) / MS_DAY);
}
export function nextMonthStart(n) {
  const { y, m } = numToYMD(n);
  return Math.round(Date.UTC(y, m, 1) / MS_DAY);
}

/** Zeitpunkt aus Tag + Uhrzeit "HH:MM" im Fenster des Tages (04:00 bis 03:59 des Folgetags). */
export function tsForDayTime(n, hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  const { y, m, d } = numToYMD(n);
  const extra = hh < DAY_START_HOUR ? 1 : 0;
  return new Date(y, m - 1, d + extra, hh, mm, 0, 0).getTime();
}

// ---------- Anzeige ----------
export function formatClock(ts) {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}
export function clockInputValue(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Minuten seit 04:00 → "9:30" */
export function formatMinutesOfDay(min) {
  const total = Math.round(min) + DAY_START_HOUR * 60;
  const h = Math.floor(total / 60) % 24, m = total % 60;
  return `${h}:${pad(m)}`;
}
export function formatDayShort(n) {
  const { m, d } = numToYMD(n);
  return `${d}. ${MONTHS_SHORT[m - 1]}`;
}
export function formatDayWithWeekday(n) {
  return `${WEEKDAYS_SHORT[weekdayOf(n)]}, ${formatDayShort(n)}`;
}
export function formatMonthYear(n) {
  const { y, m } = numToYMD(n);
  return `${MONTHS[m - 1]} ${y}`;
}
export function formatMonthShortYear(n) {
  const { y, m } = numToYMD(n);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

/** Kopfzeile des Wochenstreifens: "Oktober 2026", "Sept – Okt 2026", "Dez 2026 – Jan 2027". */
export function weekRangeLabel(monday) {
  const a = numToYMD(monday), b = numToYMD(monday + 6);
  if (a.m === b.m && a.y === b.y) return `${MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y) return `${MONTHS_SHORT[a.m - 1]} – ${MONTHS_SHORT[b.m - 1]} ${a.y}`;
  return `${MONTHS_SHORT[a.m - 1]} ${a.y} – ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
}

export function formatDuration(totalMin) {
  const t = Math.max(0, Math.floor(totalMin));
  const h = Math.floor(t / 60), m = t % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatNumber(x) {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}
