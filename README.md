# Daily Tally

Zählt, wie oft etwas passiert – pro Tag (z. B. Wasser trinken) oder pro Woche (z. B. Sport) – mit optionalem Zählziel, Pausenziel und Trend seit Aufnahmebeginn. Gebaut nach der „Daily Tally – Funktionsbeschreibung“, gestaltet im Designsystem **Kladde**.

## Starten und bauen

```bash
npm install
npm run dev        # Entwicklung
npm run build      # → dist/ (statisch, PWA mit Service Worker)
npm run preview    # dist/ lokal ansehen
npm test           # Rechenlogik (Tagesgrenze, Ziele, Pausen, Import)
```

`base: './'` in `vite.config.js` – `dist/` läuft auch in einem Unterordner, z. B. auf GitHub Pages (`https://<name>.github.io/daily-tally/`). Offline-Start braucht HTTPS (GitHub Pages hat das).

Ohne Vite geht es auch mit dem mitgelieferten esbuild:

```bash
node scripts/build-single.mjs          # dist-single/index.html – eine Datei, ohne Service Worker
node scripts/build-single.mjs --pwa    # dist-pwa/ – wie npm run build
```

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/lib/days.js` | Tagesnummern, 4-Uhr-Grenze (nur hier definiert), Wochen ab Montag, Formatierung |
| `src/lib/goals.js` | Zielverlauf („Ab jetzt“ / „Korrektur“), Zielbewertung |
| `src/lib/stats.js` | Index über alle Einträge, Pausen, Verläufe, Kennzahlen |
| `src/lib/importExport.js` | Import v3 + Prototyp v1/v2, Export |
| `src/lib/storage.js` | `localStorage` (`daily-tally-v3`), alles in try/catch |
| `src/lib/prefs.js` | gemerkte Anzeige-Einstellungen (Auflösung je Item) in `daily-tally-ui` |
| `src/lib/picker.js` | Kalender/Uhr des Systems öffnen (`showPicker()`, mit Rückfall) |
| `src/components/ReorderList.jsx` | Umsortieren per langem Drücken + Ziehen |
| `src/strings.js` | alle Oberflächentexte |
| `src/kladde/kladde.js` | Kladde-Komponenten (ES-Modul aus `components/bundle.js`) |
| `src/styles/tokens.css` | aus `src/design/tokens.json` erzeugt (`npm run tokens`) |
| `src/styles/app.css` | App-Bausteine und zentrale Maße/Animationsdauern (`--dur-*`, `--chart-*`) |
| `public/sw.js` | Service Worker: speichert beim ersten Aufruf alle verlinkten Dateien |

Design austauschen: `src/design/tokens.json` und `src/styles/kladde.css` ersetzen, `npm run tokens`.

## Tests im Browser

`tests/e2e/e2e.py` (Python + Playwright) prüft alle Abnahmekriterien in 390 px Breite, mit Touch-Gesten über das Chrome DevTools Protocol, in sandboxed iframes und offline:

```bash
node scripts/build-single.mjs && node scripts/build-single.mjs --pwa
TZ=Europe/Berlin node tests/e2e/seed.mjs > tests/e2e/seed.json   # 2 Jahre Testdaten, 5 Items
python3 -m http.server 8765 --bind 127.0.0.1 &                     # im Projektordner
python3 tests/e2e/e2e.py                                           # optional: Testgruppen als Argumente
```

## Schrift

Shantell Sans (SIL Open Font License, `src/assets/fonts/OFL.txt`), lokal eingebunden und auf lateinische Zeichen reduziert, damit die App ohne Netz mit der Handschrift startet.
