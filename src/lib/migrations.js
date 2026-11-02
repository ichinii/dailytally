// Migrationskette für das gespeicherte Datenformat.
// Reines Formatschieben: kein Prüfen, keine Imports aus importExport.js
// (sonst gäbe es einen Zyklus – importExport migriert selbst).
//
// Ein Schritt pro Release, nicht pro Feature. Jeder Schritt hebt genau eine
// Version. Eingabe ist die Struktur der Vorversion, Ausgabe eine vollständige
// neue Kopie. `release` dokumentiert, mit welchem Tag der Schritt ausgeliefert
// wurde – daran lässt sich bei Nutzerdaten ablesen, von wo jemand kommt.
//
// Regel beim Entwickeln: Die erste Formatänderung nach einem Tag erhöht
// DATA_VERSION um 1 und legt EINEN Schritt an. Jede weitere Formatänderung im
// selben Release-Zyklus erweitert diesen offenen Schritt – kein neuer Schritt,
// DATA_VERSION bleibt stehen. Mit dem Tag ist der Schritt eingefroren.

/** Älteste Version, die die Kette kennt. Davor liegen nur die Prototyp-Formate. */
export const BASE_VERSION = 3;

export const STEPS = [
  {
    to: 4,
    release: '1.1',
    up: (d) => ({
      ...d,
      version: 4,
      items: d.items.map((it) => ({
        ...it,
        gapGoals: [],   // Mindestabstand zwischen Einträgen, neu in 1.1
        pauses: [],     // Zeiträume, in denen das Item ausgesetzt ist
      })),
    }),
  },
];

/** Version, die der Code gerade schreibt. */
export const DATA_VERSION = STEPS.length ? STEPS[STEPS.length - 1].to : BASE_VERSION;

/**
 * Hebt einen Datensatz auf DATA_VERSION, Schritt für Schritt.
 * → { ok: true, data, from } | { ok: false, reason: 'format' | 'future' }
 */
export function stepUp(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'format' };
  const from = obj.version;
  if (!Number.isInteger(from) || from < BASE_VERSION) return { ok: false, reason: 'format' };
  // Neuer als dieser Code: niemals anfassen (z. B. alter Service-Worker-Cache).
  if (from > DATA_VERSION) return { ok: false, reason: 'future' };
  let data = obj;
  for (const step of STEPS) {
    if (step.to <= from) continue;
    data = step.up(data);
  }
  return { ok: true, data, from };
}
