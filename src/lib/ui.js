import { useEffect, useState } from 'react';

const msCache = new Map();
/** Liest eine Dauer aus den zentralen CSS-Variablen (z. B. --dur-sheet-in: 280ms). */
export function cssMs(name, fallback) {
  if (msCache.has(name)) return msCache.get(name);
  let v = fallback;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    if (Number.isFinite(n)) v = raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : n;
  } catch { /* Fallback */ }
  msCache.set(name, v);
  return v;
}

const pxCache = new Map();
export function cssPx(name, fallback) {
  if (pxCache.has(name)) return pxCache.get(name);
  let v = fallback;
  try {
    const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    if (Number.isFinite(n)) v = n;
  } catch { /* Fallback */ }
  pxCache.set(name, v);
  return v;
}

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Aktuelle Zeit, aktualisiert im Intervall und beim Zurückkehren in den Tab. */
export function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs]);
  return now;
}

export const TINTS = ['rose', 'lilac', 'butter', 'mint', 'sky', 'peach', 'aqua'];
/** Pastellton je Position: wechselnd, nie zwei gleiche nebeneinander. */
export const tintFor = (i) => TINTS[i % TINTS.length];
