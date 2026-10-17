# Daily Tally – Hinweise für Claude Code

Mobile Web-App (PWA) zum Zählen, wie oft etwas pro Tag, Woche oder Monat passiert. React 19 + Vite, alles lokal im Browser (`localStorage`), kein Server.

## Quellen

- `claude/Funktionsbeschreibung.md` – maßgebliche Beschreibung des **gebauten** Verhaltens inkl. Datenmodell, Stolperfallen und Abnahmekriterien. Vor Arbeit an Funktionen zuerst dort lesen.
- `claude/Design.md` – Designsystem „Kladde“ (Fassung 2). Tokens in `src/design/tokens.json`, Komponenten in `src/kladde/`. Regeln beachten (Pastellkarten, Textmarker, wellige Linien, keine Schatten auf Karten, Deutsch/du-Form).
- Beide Dokumente sind lebend: Wird Verhalten oder Gestaltung geändert, wandert die Änderung im selben Commit in das passende Dokument (neues Verhalten in den Abschnitt, neuer Prüfpunkt in die Abnahmekriterien). Kein Duplizieren von Befehlen oder Dateiaufbau – die stehen in `README.md`.

## Befehle

```bash
npm install
npm run dev            # Entwicklung
npm run build          # dist/ (PWA)
npm test               # Rechenlogik (Node, TZ=Europe/Berlin empfohlen)
npm run tokens         # tokens.css aus tokens.json neu erzeugen
node scripts/build-single.mjs [--pwa|--artifact]   # Build ohne Vite (esbuild)
```

Browser-Abnahmetests (Python + Playwright, ~150 Prüfungen): siehe README, Abschnitt „Tests im Browser“. Nach Änderungen an Gesten, Wochenstreifen, Sheets oder Diagrammen laufen lassen.

## Commits

- Keine Session-/Werbezeile in der Commit-Nachricht (kein „🤖 Generated with Claude Code“, kein Link auf die Session).
- `Co-Authored-By: Claude ... <noreply@anthropic.com>` als letzte Zeile ist in Ordnung.

## Feste Regeln (aus dem Prototyp gelernt)

- Datumsrechnung nur über Tagesnummern (`src/lib/days.js`), Tag beginnt um 04:00 – nur dort definiert. Zeiträume (Tag/Woche/Monat) nur über `periodStart`/`periodEnd` in `src/lib/goals.js`.
- Unbekannte Uhrzeit = `ts: null`, nie erfundene Werte.
- Kein `<form>`-Submit (in Sandbox-iframes blockiert). Speichern per Klick und Enter.
- Jeder `localStorage`-Zugriff in try/catch. Datenformat `{ version: 3, items, entries }`, Schlüssel `daily-tally-v3`.
- Keine blockierenden Touch-/Wheel-Listener (sonst stockt das Scrollen). Umsortieren sperrt das Scrollen erst nach dem Anheben.
- Wochenstreifen: harte Sprünge über `jumpTo` (frisches Scroll-Element), nie nur `scrollLeft` setzen – Chrome rastet sonst zur alten Woche zurück.
- Diagramme: zentrierter gleitender Durchschnitt, Achsen nur ganze Zahlen bzw. volle Stunden, keine Balken im Trend.
- Übersicht wird im Hintergrund vorbereitet und mit `content-visibility: hidden` geparkt (Wechsel < 100 ms).
- Alle Texte in `src/strings.js`, alle Maße/Dauern als CSS-Variablen in `src/styles/app.css`.
