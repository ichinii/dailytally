# Daily Tally – Hinweise für Claude Code

Mobile Web-App (PWA) zum Zählen, wie oft etwas pro Tag, Woche oder Monat passiert. React 19 + Vite, alles lokal im Browser (`localStorage`), kein Server.

## Quellen

- `claude/Funktionsbeschreibung.md` – maßgebliche Beschreibung des **gebauten** Verhaltens inkl. Datenmodell, Stolperfallen und Abnahmekriterien. Vor Arbeit an Funktionen zuerst dort lesen.
- `claude/Design.md` – Designsystem „Kladde“ (Fassung 2). Tokens in `src/design/tokens.json`, Komponenten in `src/kladde/`. Regeln beachten (Pastellkarten, Textmarker, wellige Linien, keine Schatten auf Karten, Deutsch/du-Form).
- `CHANGELOG.md` – Änderungen pro Release aus Sicht der Nutzung, kurz. Wird beim Release gefüllt; während der Arbeit wandern Einträge in den Abschnitt „Unveröffentlicht“.
- Beide Dokumente sind lebend: Wird Verhalten oder Gestaltung geändert, wandert die Änderung im selben Commit in das passende Dokument (neues Verhalten in den Abschnitt, neuer Prüfpunkt in die Abnahmekriterien). Kein Duplizieren von Befehlen oder Dateiaufbau – die stehen in `README.md`.

## Befehle

```bash
npm install
npm run dev            # Entwicklung
npm run build          # dist/ (PWA)
npm test               # Rechenlogik und Migration (Node, TZ=Europe/Berlin empfohlen)
npm run tokens         # tokens.css aus tokens.json neu erzeugen
node scripts/build-single.mjs [--pwa|--artifact]   # Build ohne Vite (esbuild)
```

Browser-Abnahmetests (Python + Playwright, ~160 Prüfungen): siehe README, Abschnitt „Tests im Browser“. Nach Änderungen an Gesten, Wochenstreifen, Sheets oder Diagrammen laufen lassen.

## Commits

- Keine Session-/Werbezeile in der Commit-Nachricht (kein „🤖 Generated with Claude Code“, kein Link auf die Session).
- `Co-Authored-By: Claude ... <noreply@anthropic.com>` als letzte Zeile ist in Ordnung.

## Releases

Releases werden ausschließlich über annotierte Git-Tags markiert (`v1.0`, `v1.1`, …) und ausschließlich über Claude Code gesetzt – nie per Hand, damit kein Release unbemerkt durchrutscht. Die Datenformat-Version ist ein eigener Zähler und hat mit der Release-Nummer nichts zu tun.

Checkliste, vollständig abzuarbeiten **vor** dem Tag:

1. Arbeitsbaum sauber, auf `main`.
2. `TZ=Europe/Berlin npm test` – grün (Rechenlogik und Migration).
3. Browser-Abnahmetests nach README – grün.
4. `npm run build` ohne Fehler.
5. Bei geänderter Datenform: genau ein Migrationsschritt für dieses Release, mit `release`-Nummer und eigenem Test; Tabelle Release ↔ Datenformat in `claude/Funktionsbeschreibung.md` ergänzt.
6. `claude/Funktionsbeschreibung.md` und `claude/Design.md` auf dem Stand des Codes.
   `CHANGELOG.md`: Abschnitt „Unveröffentlicht“ in einen Release-Abschnitt mit Datum umbenennen, neuen leeren anlegen.
7. `package.json`-Version = Tag ohne `v`.
8. `git tag -a vX.Y -m "Release X.Y"`.
9. `git push origin main --follow-tags`, danach den Workflow-Lauf prüfen: erst wenn `deploy` grün ist, ist das Release draußen (siehe README, „Veröffentlichen“).

Schlägt ein Punkt fehl, wird nicht getaggt, sondern berichtet.

## Feste Regeln (aus dem Prototyp gelernt)

- Datumsrechnung nur über Tagesnummern (`src/lib/days.js`), Tag beginnt um 04:00 – nur dort definiert. Zeiträume (Tag/Woche/Monat) nur über `periodStart`/`periodEnd` in `src/lib/goals.js`.
- Unbekannte Uhrzeit = `ts: null`, nie erfundene Werte.
- Kein `<form>`-Submit (in Sandbox-iframes blockiert). Speichern per Klick und Enter.
- Jeder `localStorage`-Zugriff in try/catch. Datenformat `{ version, items, entries }`; die laufende Version ist `DATA_VERSION` in `src/lib/migrations.js`. Der Schlüssel bleibt dauerhaft `daily-tally-v3` – Umbenennen würde die Daten bestehender Nutzer verwaisen lassen.
- Ändert sich die Datenform, gehört in dieselbe Änderung ein Migrationsschritt in `STEPS` (`src/lib/migrations.js`) **und** ein Test in `tests/migrations.test.mjs`. `DATA_VERSION` nie ohne Schritt erhöhen.
- Höchstens ein Schritt pro Release: Im laufenden Release-Zyklus den offenen Schritt erweitern, keinen neuen anlegen. Ist ein Release getaggt, ist sein Schritt eingefroren. Hat das eigene Gerät ein Zwischenformat, wird es per Export/Import geradegezogen, nicht per Zusatzschritt.
- Laden und Datei-Import gehen durch denselben Eingang (`upgradeAny` in `src/lib/importExport.js`); keinen zweiten Pfad aufbauen.
- Keine blockierenden Touch-/Wheel-Listener (sonst stockt das Scrollen). Umsortieren sperrt das Scrollen erst nach dem Anheben.
- Wochenstreifen: harte Sprünge über `jumpTo` (frisches Scroll-Element), nie nur `scrollLeft` setzen – Chrome rastet sonst zur alten Woche zurück.
- Diagramme: zentrierter gleitender Durchschnitt, Achsen nur ganze Zahlen bzw. volle Stunden, keine Balken im Trend.
- Übersicht wird im Hintergrund vorbereitet und mit `content-visibility: hidden` geparkt (Wechsel < 100 ms).
- Alle Texte in `src/strings.js`, alle Maße/Dauern als CSS-Variablen in `src/styles/app.css`.
