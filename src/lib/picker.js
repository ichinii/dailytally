// Native Auswahl (Kalender, Uhr) des Browsers bzw. Betriebssystems.
// Auf Touch-Geräten öffnet schon das Antippen des (unsichtbaren) Eingabefelds die Auswahl.
// Mit Maus braucht es showPicker(); das ist in fremden iframes (z. B. eingebetteten Vorschauen) gesperrt
// → dann gibt die Funktion false zurück und das Feld wird sichtbar gemacht.
export const finePointer = () => {
  try { return window.matchMedia('(pointer: fine)').matches; } catch { return false; }
};

export function openPicker(input) {
  if (!input) return false;
  try {
    if (typeof input.showPicker === 'function') { input.showPicker(); return true; }
  } catch { /* gesperrt */ }
  return false;
}
