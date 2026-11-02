import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/kladde.css';
import './styles/app.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// Installierbare Web-App: Service Worker nur, wenn der Build ihn ausdrücklich
// vorsieht (__PWA__ === true). Am Entwicklungsserver ist __PWA__ nicht definiert –
// dort würde der Service Worker die Module von Vite abfangen und altes Material
// ausliefern, sodass nur ein erzwungenes Neuladen noch durchkommt.
if (typeof __PWA__ !== 'undefined' && __PWA__) {
  try {
    if ('serviceWorker' in navigator && window.isSecureContext && window.top === window.self) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  } catch { /* nicht verfügbar */ }
} else {
  // Kein PWA-Stand (Entwicklungsserver, Vorschau): einen früher hier registrierten
  // Service Worker abmelden, sonst liefert er alte Dateien aus und das Neuladen
  // bricht. Nur die eigene Registrierung – fremde auf derselben Adresse bleiben.
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      const scope = new URL('./', window.location.href).href;
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => { if (r.scope === scope) r.unregister(); }))
        .catch(() => {});
    }
  } catch { /* nicht verfügbar */ }
}
