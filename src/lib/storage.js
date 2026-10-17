// Browser-Speicher. Jeder Zugriff in try/catch: in Sandboxes ohne allow-same-origin wirft schon der Zugriff.
import { validateV3 } from './importExport.js';

export const STORAGE_KEY = 'daily-tally-v3';

export const emptyData = () => ({ version: 3, items: [], entries: [] });

/** → { data, available } */
export function loadData() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData(), available: false };
  }
  if (!raw) return { data: emptyData(), available: true };
  try {
    const res = validateV3(JSON.parse(raw));
    if (res.ok) return { data: res.data, available: true };
  } catch { /* unten */ }
  // Kaputte Daten nicht stillschweigend überschreiben: zur Seite legen.
  try { window.localStorage.setItem(`${STORAGE_KEY}-defekt-${Date.now()}`, raw); } catch { /* egal */ }
  return { data: emptyData(), available: true };
}

/** → true, wenn gespeichert */
export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function requestPersistentStorage() {
  try {
    const p = navigator.storage && navigator.storage.persist && navigator.storage.persist();
    if (p && p.catch) p.catch(() => {});
  } catch { /* nicht verfügbar */ }
}

let seq = 0;
export function newId(prefix) {
  seq = (seq + 1) % 1296;
  return prefix + Date.now().toString(36) + seq.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 5);
}
