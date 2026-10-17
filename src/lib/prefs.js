// Kleine Anzeige-Einstellungen (z. B. gewählte Auflösung) im Browser-Speicher. Getrennt von den Daten.
import { useCallback, useState } from 'react';

const KEY = 'daily-tally-ui';
let cache = null;

function load() {
  if (cache) return cache;
  try { cache = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch { cache = {}; }
  if (typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  return cache;
}

export function getPref(key, fallback, allowed) {
  const v = load()[key];
  if (v === undefined || (allowed && !allowed.includes(v))) return fallback;
  return v;
}

export function setPref(key, value) {
  load()[key] = value;
  try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* nur für diese Sitzung */ }
}

/** useState, der sich den Wert merkt. `allowed` schützt vor veralteten Werten. */
export function usePref(key, fallback, allowed) {
  const [v, setV] = useState(() => getPref(key, fallback, allowed));
  const set = useCallback((next) => { setV(next); setPref(key, next); }, [key]);
  return [v, set];
}
