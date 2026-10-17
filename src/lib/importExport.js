// Import (aktuelles Format v3 und die beiden Prototyp-Formate) und Export.
import { isValidKey, keyToNum, numToKey, dayOfTs } from './days.js';
import { periodStart, PERIODS } from './goals.js';
import { IMPORT_ERRORS } from '../strings.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPosInt = (v) => Number.isInteger(v) && v >= 1;
const fail = (why) => ({ ok: false, error: IMPORT_ERRORS[why] });

function cleanLabel(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, 40);
  return s.length ? s : null;
}

function validCountGoals(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const g of list) {
    if (!isObj(g) || !isValidKey(g.from)) return null;
    if (g.value === null) out.push({ from: g.from, type: null, value: null });
    else if ((g.type === 'max' || g.type === 'min') && isPosInt(g.value)) out.push({ from: g.from, type: g.type, value: g.value });
    else return null;
  }
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

function validPauseGoals(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const g of list) {
    if (!isObj(g) || !isValidKey(g.from)) return null;
    if (g.minutes === null) out.push({ from: g.from, minutes: null });
    else if (isPosInt(g.minutes)) out.push({ from: g.from, minutes: g.minutes });
    else return null;
  }
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** Prüft das aktuelle Format und liefert eine saubere Kopie. */
export function validateV3(obj) {
  if (!isObj(obj) || obj.version !== 3 || !Array.isArray(obj.items) || !Array.isArray(obj.entries)) return fail('format');
  const items = [];
  const ids = new Set();
  for (const it of obj.items) {
    if (!isObj(it) || typeof it.id !== 'string' || !it.id || ids.has(it.id)) return fail('items');
    const label = cleanLabel(it.label);
    const countGoals = validCountGoals(it.countGoals ?? []);
    const pauseGoals = validPauseGoals(it.pauseGoals ?? []);
    if (!label || !PERIODS.includes(it.period) || !isValidKey(it.createdDay) || !countGoals || !pauseGoals) return fail('items');
    ids.add(it.id);
    items.push({ id: it.id, label, period: it.period, createdDay: it.createdDay, countGoals, pauseGoals: it.period === 'day' ? pauseGoals : [] });
  }
  const entries = [];
  const eids = new Set();
  for (const e of obj.entries) {
    if (!isObj(e) || typeof e.id !== 'string' || !e.id || eids.has(e.id) || !ids.has(e.itemId) || !isValidKey(e.day)) return fail('entries');
    if (!(e.ts === null || (typeof e.ts === 'number' && Number.isFinite(e.ts)))) return fail('entries');
    eids.add(e.id);
    entries.push({ id: e.id, itemId: e.itemId, day: e.day, ts: e.ts });
  }
  return { ok: true, format: 'v3', data: { version: 3, items, entries } };
}

// ---------- Prototyp-Formate ----------
function protoPeriod(it) {
  const p = String(it.period ?? it.periodType ?? it.type ?? it.frequency ?? it.interval ?? 'day');
  return /week|woche/i.test(p) ? 'week' : /month|monat/i.test(p) ? 'month' : 'day';
}
function protoGoalType(t) {
  return /min|least|mindest|>=/i.test(String(t ?? '')) ? 'min' : 'max';
}
function protoGoals(it, period, createdNum) {
  const goal = Number(it.goal ?? it.target);
  if (!Number.isFinite(goal) || Math.floor(goal) < 1) return [];
  return [{ from: numToKey(periodStart(period, createdNum)), type: protoGoalType(it.goalType ?? it.goalKind), value: Math.floor(goal) }];
}

function convertV2(obj) {
  if (!Array.isArray(obj.items) || !isObj(obj.counts)) return fail('format');
  const items = [];
  const ids = new Set();
  const entries = [];
  let k = 0;
  for (const it of obj.items) {
    if (!isObj(it) || it.id == null) return fail('items');
    const id = String(it.id);
    if (ids.has(id)) return fail('items');
    const label = cleanLabel(it.label ?? it.name);
    if (!label) return fail('items');
    const period = protoPeriod(it);
    const days = isObj(obj.counts[id]) ? Object.keys(obj.counts[id]).filter(isValidKey).sort() : [];
    let createdNum = isValidKey(it.createdDay) ? keyToNum(it.createdDay)
      : Number.isFinite(it.createdAt) ? dayOfTs(it.createdAt)
      : days.length ? keyToNum(days[0]) : dayOfTs(Date.now());
    ids.add(id);
    items.push({ id, label, period, createdDay: numToKey(createdNum), countGoals: protoGoals(it, period, createdNum), pauseGoals: [] });
    for (const day of days) {
      const c = Number(obj.counts[id][day]);
      if (!Number.isFinite(c) || c < 0) return fail('entries');
      for (let i = 0; i < Math.floor(c); i++) entries.push({ id: `m${(k++).toString(36)}`, itemId: id, day, ts: null });
    }
  }
  entries.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  return { ok: true, format: 'v2', data: { version: 3, items, entries } };
}

function convertV1(obj) {
  if (!Array.isArray(obj.items) || !Array.isArray(obj.events)) return fail('format');
  const items = [];
  const ids = new Set();
  for (const it of obj.items) {
    if (!isObj(it) || it.id == null) return fail('items');
    const id = String(it.id);
    if (ids.has(id)) return fail('items');
    const label = cleanLabel(it.label ?? it.name);
    if (!label) return fail('items');
    const period = protoPeriod(it);
    const createdNum = Number.isFinite(it.createdAt) ? dayOfTs(it.createdAt) : isValidKey(it.createdDay) ? keyToNum(it.createdDay) : null;
    ids.add(id);
    items.push({ id, label, period, createdNum, src: it });
  }
  const events = [];
  for (const ev of obj.events) {
    if (!isObj(ev) || !ids.has(String(ev.itemId)) || typeof ev.ts !== 'number' || !Number.isFinite(ev.ts)) return fail('entries');
    events.push(ev);
  }
  events.sort((a, b) => a.ts - b.ts);
  const firstDay = new Map();
  const entries = events.map((ev, i) => {
    const day = dayOfTs(ev.ts);
    const itemId = String(ev.itemId);
    if (!firstDay.has(itemId)) firstDay.set(itemId, day);
    return { id: ev.id != null ? `v${String(ev.id)}` : `v${i.toString(36)}`, itemId, day: numToKey(day), ts: ev.ts };
  });
  const seen = new Set();
  for (const e of entries) { if (seen.has(e.id)) return fail('entries'); seen.add(e.id); }
  const out = items.map(({ id, label, period, createdNum, src }) => {
    const c = createdNum ?? firstDay.get(id) ?? dayOfTs(Date.now());
    return { id, label, period, createdDay: numToKey(c), countGoals: protoGoals(src, period, c), pauseGoals: [] };
  });
  return { ok: true, format: 'v1', data: { version: 3, items: out, entries } };
}

/** Text einer Importdatei → { ok, data, format } oder { ok:false, error } */
export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return fail('json'); }
  if (!isObj(obj)) return fail('format');
  if (obj.version === 3) return validateV3(obj);
  if (isObj(obj.counts)) return convertV2(obj);
  if (Array.isArray(obj.events)) return convertV1(obj);
  return fail('format');
}

export const exportText = (data) => JSON.stringify(data, null, 2);
export const exportFileName = (todayNum) => `daily-tally-${numToKey(todayNum)}.json`;
