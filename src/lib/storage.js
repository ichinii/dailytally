// Browser-Speicher. Jeder Zugriff in try/catch: in Sandboxes ohne allow-same-origin wirft schon der Zugriff.
import { upgradeAny } from './importExport.js';
import { DATA_VERSION } from './migrations.js';

// Der Schlüssel behält seinen historischen Namen: er ist nur ein Name, ein
// Umbenennen würde die Daten aller bestehenden Nutzer verwaisen lassen.
// Die Wahrheit über das Format steht im Feld `version`.
export const STORAGE_KEY = 'daily-tally-v3';

export const emptyData = () => ({ version: DATA_VERSION, items: [], entries: [] });

/** Legt den Rohtext unangetastet zur Seite. Darf nie das Laden verhindern. */
function backup(raw, why) {
  try { window.localStorage.setItem(`${STORAGE_KEY}-${why}-${Date.now()}`, raw); } catch { /* egal */ }
}

/** → { data, available } */
export function loadData() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData(), available: false };
  }
  if (!raw) return { data: emptyData(), available: true };
  let res;
  try {
    res = upgradeAny(JSON.parse(raw));
  } catch {
    res = { ok: false };
  }
  if (res.ok) {
    // Migrierter Stand: alten Rohtext sichern und gleich im neuen Format ablegen.
    if (res.format !== `v${DATA_VERSION}`) {
      backup(raw, res.format);
      saveData(res.data);
    }
    return { data: res.data, available: true };
  }
  // Nicht stillschweigend überschreiben: zur Seite legen. Daten aus einer
  // neueren Version landen unter `-neuer-`, damit der Auto-Save sie nicht frisst.
  backup(raw, res.reason === 'future' ? 'neuer' : 'defekt');
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
