# Daily Tally

Zählt, wie oft etwas passiert – pro Tag (z. B. Wasser trinken) oder pro Woche (z. B. Sport) – mit optionalem Zählziel, Pausenziel und Trend seit Aufnahmebeginn. Gebaut nach der „Daily Tally – Funktionsbeschreibung“, gestaltet im Designsystem **Kladde**.

## Starten und bauen

```bash
npm install
npm run dev        # Entwicklung
npm run build      # → dist/ (statisch, PWA mit Service Worker)
npm run preview    # dist/ lokal ansehen
npm test           # Rechenlogik (Tagesgrenze, Ziele, Pausen, Import) und Migration
```

`base: './'` in `vite.config.js` – `dist/` läuft auch in einem Unterordner, z. B. auf GitHub Pages. Offline-Start braucht HTTPS (GitHub Pages hat das).

## Veröffentlichen

Live unter <https://ichinii.github.io/dailytally/>. Zwei getrennte Dinge:

- **Push auf `main`** startet `.github/workflows/deploy.yml` als reinen Testlauf: bauen und `npm test`. Veröffentlicht wird nichts. `main` ist Arbeitsstand, nicht Produktion.
- **Push eines Tags `v*`** läuft dieselben Tests und veröffentlicht danach `dist/` auf GitHub Pages. Der `deploy`-Job hängt am `build`-Job – rote Tests heißen also kein Deploy, der alte Stand bleibt online.

```bash
git push origin main          # testet
git push origin v1.1          # testet und veröffentlicht
```

Ein manueller Lauf über „Run workflow“ veröffentlicht nur, wenn er auf einem Tag gestartet wird; von `main` aus bleibt er ein Testlauf.

Voraussetzung im Repo: Settings → Pages → Source „GitHub Actions“. Steht das nicht, läuft `build` grün durch und `deploy` schlägt fehl, ohne dass sich an der Website etwas ändert.

Die Adresse ist die Project-Pages-Adresse dieses Repos (`https://<user>.github.io/<repo>/`) und kommt ohne Kopieren zustande. Sie darf nicht gleichzeitig aus einem Ordner `dailytally/` im User-Site-Repo `ichinii.github.io` bedient werden – zwei Quellen für eine Adresse.

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
| `src/lib/migrations.js` | Migrationskette des Datenformats (`DATA_VERSION`, ein Schritt pro Release) |
| `src/lib/pauses.js` | Aussetz-Zeiträume je Item (prüfen, setzen, beenden, verschmelzen) |
| `src/lib/importExport.js` | Import (aktuelles Format, ältere über die Kette, Prototyp v1/v2), Export |
| `src/lib/storage.js` | `localStorage` (`daily-tally-v3`), Migration beim Laden, alles in try/catch |
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

Die Browser kommen standardmäßig aus `/opt/pw-browsers`; `PLAYWRIGHT_BROWSERS_PATH` setzen, wenn sie woanders liegen.

## Schrift

Shantell Sans (SIL Open Font License, `src/assets/fonts/OFL.txt`), lokal eingebunden und auf lateinische Zeichen reduziert, damit die App ohne Netz mit der Handschrift startet.
