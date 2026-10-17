// Alle Zahlen und Verläufe werden aus den Einträgen berechnet.
import {
  keyToNum, dayStartTs, dayEndTs, mondayOf, monthStartOf, nextMonthStart, numToYMD,
  formatDayWithWeekday, formatDayShort, formatMonthYear, formatMonthShortYear,
} from './days.js';
import { MONTHS_SHORT } from '../strings.js';
import { countGoalAt, pauseGoalAt, periodStart, periodEnd } from './goals.js';

const keyCache = new Map();
export function dayNum(key) {
  let n = keyCache.get(key);
  if (n === undefined) { n = keyToNum(key); keyCache.set(key, n); }
  return n;
}

/** Index über alle Einträge: pro Item Zählungen je Tag, Einträge mit Uhrzeit, Tage mit Einträgen ohne Uhrzeit. */
export function buildIndex(data) {
  const byItem = new Map();
  for (const it of data.items) {
    byItem.set(it.id, { counts: new Map(), timed: [], untimedSet: new Set(), untimed: null, first: Infinity, n: 0, sig: 0 });
  }
  const activeDays = new Set();
  for (const e of data.entries) {
    const r = byItem.get(e.itemId);
    if (!r) continue;
    const d = dayNum(e.day);
    r.counts.set(d, (r.counts.get(d) || 0) + 1);
    if (e.ts == null) r.untimedSet.add(d);
    else r.timed.push({ ts: e.ts, day: d });
    if (d < r.first) r.first = d;
    r.n++;
    r.sig = (r.sig * 31 + d * 7 + (e.ts == null ? 1 : e.ts % 100003)) % 2147483647;
    activeDays.add(d);
  }
  for (const r of byItem.values()) {
    r.timed.sort((a, b) => a.ts - b.ts);
    r.untimed = Array.from(r.untimedSet).sort((a, b) => a - b);
  }
  return { byItem, activeDays };
}

export function dayCount(r, d) { return (r && r.counts.get(d)) || 0; }
export function weekCount(r, monday) {
  let s = 0;
  for (let d = monday; d < monday + 7; d++) s += dayCount(r, d);
  return s;
}
/** Anzahl im Zeitraum (Tag, Woche, Monat), der Tag n enthält. */
export function periodCount(r, period, n) {
  let s = 0;
  for (let d = periodStart(period, n), e = periodEnd(period, n); d < e; d++) s += dayCount(r, d);
  return s;
}

/** Gibt es an einem Tag in [a, b] einen Eintrag ohne Uhrzeit? (Binärsuche) */
export function hasUntimedIn(sorted, a, b) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < a) lo = mid + 1; else hi = mid; }
  return lo < sorted.length && sorted[lo] <= b;
}

/** Laufende Pause seit dem letzten Eintrag – nur bekannt, wenn der neueste Eintrag eine Uhrzeit hat. */
export function runningPause(r, today, now) {
  if (!r || r.timed.length === 0) return { known: false, reason: r && r.n > 0 ? 'untimed' : 'none' };
  const last = r.timed[r.timed.length - 1];
  if (hasUntimedIn(r.untimed, last.day, today)) return { known: false, reason: 'untimed' };
  return { known: true, minutes: Math.max(0, (now - last.ts) / 60000), since: last.ts };
}

export function itemStart(item, r) {
  return Math.min(dayNum(item.createdDay), r ? r.first : Infinity);
}

/**
 * Längste gültige Pause je Tag (Minuten) von start bis today; null = unbekannt.
 * Eine Pause gehört zum Tag, an dem sie endet; Tage ohne Einträge, über die sie läuft, bekommen die Länge bis Tagesende.
 */
export function dailyPauses(r, start, today, now) {
  const len = today - start + 1;
  const out = new Array(len).fill(null);
  const put = (d, min) => {
    if (d < start || d > today) return;
    const i = d - start;
    if (out[i] == null || min > out[i]) out[i] = min;
  };
  const t = r.timed;
  const span = (a, endDay, endTs) => {
    if (hasUntimedIn(r.untimed, a.day, endDay)) return;
    put(endDay, (endTs - a.ts) / 60000);
    for (let d = a.day + 1; d < endDay; d++) put(d, (dayEndTs(d) - a.ts) / 60000);
  };
  for (let i = 1; i < t.length; i++) span(t[i - 1], t[i].day, t[i].ts);
  if (t.length) {
    const last = t[t.length - 1];
    if (now > last.ts) span(last, today, now);
  }
  return out;
}

/** Uhrzeit des ersten Eintrags je Tag (Minuten seit 04:00); Tage mit einem Eintrag ohne Uhrzeit fallen weg. */
export function firstEntryMinutes(r, start, today) {
  const out = new Array(today - start + 1).fill(null);
  for (const e of r.timed) {
    if (e.day < start || e.day > today || r.untimedSet.has(e.day)) continue;
    const i = e.day - start;
    if (out[i] == null) out[i] = (e.ts - dayStartTs(e.day)) / 60000;
  }
  return out;
}

/** Anteil der Einträge je Stunde (Index 0 = 04:00 … 23 = 03:00). */
export function hourShares(r, fromDay) {
  const bins = new Array(24).fill(0);
  let total = 0;
  for (const e of r.timed) {
    if (e.day < fromDay) continue;
    const h = new Date(e.ts).getHours();
    bins[(h - 4 + 24) % 24]++;
    total++;
  }
  return { bins: bins.map((b) => (total ? b / total : 0)), total };
}

// ---------- Verläufe ----------
const SMOOTH_HALF = { day: 3, week: 1, month: 1 }; // Fensterbreite 7 Tage / 3 Wochen / 3 Monate

function periodsFor(res, start, today) {
  const out = [];
  if (res === 'day') {
    for (let d = start; d <= today; d++) out.push([d, d + 1]);
  } else if (res === 'week') {
    for (let m = mondayOf(start); m <= today; m += 7) out.push([m, m + 7]);
  } else {
    for (let m = monthStartOf(start); m <= today; m = nextMonthStart(m)) out.push([m, nextMonthStart(m)]);
  }
  return out;
}

function tickLabel(res, p) {
  const { y, m, d } = numToYMD(p);
  if (res === 'day') return `${d}.${m}.`;
  if (res === 'week') return `${d}. ${MONTHS_SHORT[m - 1]}`;
  return m === 1 ? `${MONTHS_SHORT[0]} ${String(y).slice(2)}` : MONTHS_SHORT[m - 1];
}

function longLabel(res, p, coveredStart) {
  if (res === 'day') return formatDayWithWeekday(p);
  if (res === 'week') return `Woche vom ${formatDayShort(p)}`;
  return formatMonthYear(p);
}

/**
 * Verlauf für eine Auflösung.
 * daily: Werte je Tag ab start (null = unbekannt). mode 'rate': Summe pro Einheit (unitDays), 'mean': Mittel bekannter Tage.
 * raw: Auflösung = Zeitraum des Items (Wochen-Item in Wochen, Monats-Item in Monaten) → einfache Summe.
 */
export function buildSeries({ daily, start, today, res, mode, unitDays = 1, raw = false, goalAt }) {
  const periods = periodsFor(res, start, today);
  const pts = periods.map(([p, end]) => {
    const a = Math.max(p, start), b = Math.min(end, today + 1);
    let sum = 0, known = 0;
    for (let d = a; d < b; d++) {
      const v = daily[d - start];
      if (v != null) { sum += v; known++; }
    }
    let value;
    if (mode === 'rate') value = raw ? sum : (b > a ? (sum / (b - a)) * unitDays : 0);
    else value = known ? sum / known : null;
    const gg = goalAt ? goalAt(a) : null;
    return {
      start: p, value, provisional: end > today,
      goal: gg ? gg.value : null, goalLabel: gg ? gg.text : null,
      tick: tickLabel(res, p), label: longLabel(res, p, a),
    };
  });
  // Zentrierter gleitender Durchschnitt (Nachbarn links und rechts): die Linie läuft mitten durch die Punkte,
  // statt wie ein nachlaufender Durchschnitt hinterherzuhinken. Am Rand wird über die vorhandenen Werte gemittelt.
  const half = SMOOTH_HALF[res];
  for (let i = 0; i < pts.length; i++) {
    let s = 0, k = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(pts.length - 1, i + half); j++) if (pts[j].value != null) { s += pts[j].value; k++; }
    pts[i].smooth = k ? s / k : null;
  }
  return pts;
}

// ---------- Kennzahlen ----------
function windowAvg(daily, start, from, to) {
  let sum = 0, len = 0;
  for (let d = Math.max(from, start); d <= to; d++) { sum += daily[d - start] || 0; len++; }
  return { avg: len ? sum / len : null, len };
}

export function countKpi(item, daily, start, today) {
  if (item.period === 'day') {
    const cur = windowAvg(daily, start, today - 7, today - 1);
    const prev = windowAvg(daily, start, today - 14, today - 8);
    return { avg: cur.avg, prev: cur.avg != null && prev.len === 7 ? prev.avg : null };
  }
  if (item.period === 'month') {
    // Durchschnitt pro Monat der letzten 3 abgeschlossenen Monate, verglichen mit den 3 davor
    const months = [];
    let m = periodStart('month', today);
    for (let i = 0; i < 6; i++) { m = periodStart('month', m - 1); months.push(m); }
    const firstM = periodStart('month', start);
    const sumMonth = (ms) => { let s = 0; for (let d = ms, e = periodEnd('month', ms); d < e; d++) if (d >= start && d <= today) s += daily[d - start] || 0; return s; };
    const avgOf = (list) => { const ok = list.filter((x) => x >= firstM); return { avg: ok.length ? ok.reduce((a, x) => a + sumMonth(x), 0) / ok.length : null, n: ok.length }; };
    const cur = avgOf(months.slice(0, 3)), prev = avgOf(months.slice(3, 6));
    return { avg: cur.avg, prev: cur.avg != null && prev.n === 3 ? prev.avg : null };
  }
  const curMon = mondayOf(today), firstMon = mondayOf(start);
  const weeks = (fromMon, toMon) => {
    let sum = 0, n = 0;
    for (let m = Math.max(fromMon, firstMon); m <= toMon; m += 7) {
      for (let d = m; d < m + 7; d++) if (d >= start && d <= today) sum += daily[d - start] || 0;
      n++;
    }
    return { avg: n ? sum / n : null, n };
  };
  const cur = weeks(curMon - 28, curMon - 7);
  const prev = weeks(curMon - 56, curMon - 35);
  return { avg: cur.avg, prev: cur.avg != null && prev.n === 4 ? prev.avg : null };
}

export function pauseKpi(item, pauses, start, today) {
  let reached = 0, total = 0, unknown = 0;
  for (let d = Math.max(today - 7, start); d <= today - 1; d++) {
    const goal = pauseGoalAt(item, d);
    if (goal == null) continue;
    total++;
    const v = pauses[d - start];
    if (v == null) unknown++;
    else if (v >= goal) reached++;
  }
  return { reached, total, unknown };
}

/** Alles, was die Übersicht für ein Item braucht (ohne Auflösung). */
export function computeItemStats(item, r, today, now) {
  const start = Math.min(itemStart(item, r), today);
  const daily = new Array(today - start + 1).fill(0);
  for (const [d, c] of r.counts) if (d >= start && d <= today) daily[d - start] = c;
  const hasPauseGoal = item.period === 'day' && item.pauseGoals.some((g) => g.minutes != null);
  const pauses = hasPauseGoal ? dailyPauses(r, start, today, now) : null;
  const timedCount = r.timed.length;
  const timeStats = timedCount >= 20 ? {
    hours4w: hourShares(r, today - 27),
    hoursAll: hourShares(r, -Infinity),
    first: item.period === 'day' ? firstEntryMinutes(r, start, today) : null,
  } : null;
  let firstAvg = null;
  if (timeStats && timeStats.first) {
    let s = 0, k = 0;
    for (let d = Math.max(start, today - 6); d <= today; d++) { const v = timeStats.first[d - start]; if (v != null) { s += v; k++; } }
    firstAvg = k ? s / k : null;
  }
  return {
    start, daily, pauses, timedCount, timeStats, firstAvg,
    kpi: countKpi(item, daily, start, today),
    pauseKpi: pauses ? pauseKpi(item, pauses, start, today) : null,
    countGoalAt: (d) => countGoalAt(item, periodStart(item.period, d)),
    pauseGoalAt: (d) => pauseGoalAt(item, d),
  };
}
