# Kladde – Designsystem (Fassung 2)

Kladde ist das Designsystem für kleine, funktionale Webapps: Tracker, Checklisten, Planer, Tagebücher. Es soll sich anfühlen wie ein liebevoll geführtes Notizheft: warmes Papier, Pastellkarten, Textmarker, Handschrift und Linien, die nicht ganz gerade sind. Gemütlich, aber nie verspielt auf Kosten der Bedienbarkeit.

Fassung 2 beruht auf dem ursprünglichen Kladde-Designsystem (Tokens, 21 Komponenten, README). Ergänzt sind alle gestalterischen Entscheidungen, die beim Bau von **Daily Tally** offen waren und festgelegt werden mussten: Sheets, Diagramme, Zähler, Umsortieren, native Datums-/Zeitwähler, Dunkelmodus, Bewegung und Schrift ohne Netz. Abschnitt 13 listet die Änderungen gegenüber Fassung 1.

Quelle der Tokens: `src/design/tokens.json` → `npm run tokens` → `src/styles/tokens.css`. Komponenten: `src/kladde/kladde.js` + `src/styles/kladde.css`. App-Bausteine: `src/styles/app.css`.

---

## 1. Haltung und Sprache

- Deutsch, du-Form, freundlich und kurz. Ermutigend statt belehrend, nie unter Druck setzend: Ziele sind Orientierung, kein Soll.
- Buttons: Verb zuerst, Satzanfang groß („Eintrag speichern“, „Datei wählen“). Ein Wort, wenn es reicht („Speichern“, „Heute“).
- Status klein geschrieben: „erledigt“, „gespeichert“, „im Rahmen“, „vorläufig“.
- Toasts im Perfekt: „Eintrag gelöscht“, „Daten importiert“.
- Fehlermeldungen sagen, was passiert ist und was zu tun ist: „Diese Uhrzeit liegt in der Zukunft.“ Nie nur „Ungültig“. Bei Datenaktionen immer dazusagen, dass nichts verändert wurde.
- Leere Zustände sagen auf einem `Note`-Zettel, was als Nächstes zu tun ist, mit einem konkreten Beispiel.
- Beispiele in Platzhaltern neutral und freundlich („z. B. Gläser Wasser“), nichts Wertendes.
- Zahlen: Dezimalkomma, eine Nachkommastelle nur wenn nötig („8,2“, aber „8“). Uhrzeiten ohne führende Null bei der Stunde („9:30“, „14:32“), Spannen mit Halbgeviertstrich und Leerzeichen („6:30 – 7:00“). Dauern als „9 h 40 min“, „11 h“, „40 min“.
- Monatsnamen kurz: Jan, Feb, März, Apr, Mai, Juni, Juli, Aug, Sept, Okt, Nov, Dez. Wochentage: Mo bis So.
- Keine Emoji als Gestaltungsmittel. Kritzel kommen aus `Icon`.
- Alle Texte einer App zentral in einer Datei (`strings.js`).

---

## 2. Farben

### Tokens

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `paper` | #fdf6f0 | #1f1917 | Seitenhintergrund, Sheets |
| `paper-raised` | #fffbf7 | #29211f | Eingaben, neutrale Karten, Tab-Leisten, Diagramm-Hintergrund leerer Balken |
| `line` | #e8dad1 | #3a302d | Dekorative Wellen, Gitterlinien in Diagrammen |
| `line-strong` | #8c7570 | #8f7d77 | Rahmen von Bedienelementen, Ziel-Hilfslinie in Diagrammen (≥ 3:1) |
| `ink` | #2e1f1d | #f4e9e2 | Text, Icons, Trendlinie, Rahmen von Checkbox und Primär-Button |
| `ink-muted` | #6e5a55 | #bfaea6 | Nebentext, Achsenbeschriftung, Einzelpunkte im Diagramm |
| `accent` | #a23f5c | #f2a7bc | Nur Links und aktive Textzustände |
| `tint-rose` … `tint-aqua` | Pastell | gedämpft | Kartenflächen (7 Töne) |
| `mark-rose` … `mark-aqua` | kräftigeres Pastell | dunkler | Textmarker, Fortschrittsfüllung der jeweiligen Karte |
| `sticky` | #f7d3da | #5a3540 | Klebezettel, Toast |
| `success` / `success-soft` | #2f6a3d / #e3f0dc | #a3d6a0 / #223122 | „im Rahmen“, „erreicht“, „gespeichert“ |
| `danger` / `danger-soft` | #a8372f / #fbe0dc | #ff9f92 / #3d2321 | Fehler, Löschen, „überschritten“, Hinweis-Leisten |
| `doodle` | #f3c27e | #f3c27e | Nur dekorative Kritzel-Füllung |
| `scrim` | #2e1f1d59 | #000000a6 | Abdunklung hinter Sheets |
| `primary` | = `mark-rose` | = `mark-rose` | Primär-Button (immer mit `ink`-Rahmen und `ink`-Text) |

Die sieben Pastelltöne: rose, lilac, butter, mint, sky, peach, aqua.

### Regeln

- Die Seite ist immer `paper`. Inhalt sitzt auf Pastellkarten (`tint-*`). Technisches (Einstellungen, Menü, Formulare) liegt auf `paper-raised`-Karten mit Haarlinie.
- Jede Karte bekommt ihren Textmarker und ihre Fortschrittsfüllung in derselben Farbe (`tint-sky` → `mark-sky`).
- **Farbvergabe nach Position:** In Listen gleichartiger Dinge (Items, Einträge) wird der Ton nach der Position im Zyklus rose → lilac → butter → mint → sky → peach → aqua vergeben. So stehen nie zwei gleiche Töne nebeneinander, und dasselbe Ding hat in allen Ansichten dieselbe Farbe. Nach dem Umsortieren wandern die Farben mit der Position. Feste Bedeutungen wie rose = Morgen oder lilac = Lernen nur dann, wenn die App solche Kategorien wirklich hat.
- Text fast immer `ink`. `ink-muted` nur auf `paper`, `paper-raised` und `tint-*`, nie auf `mark-*` oder `sticky`.
- Status nie nur über Farbe, sondern immer mit Wort und Icon: Häkchen für success, Warndreieck für danger, Uhr für „noch offen“.
- Keine Verläufe, keine farbigen Ränder links an Karten, keine Glas-Effekte, keine Schatten auf Karten.

---

## 3. Schrift

- **Eine Familie:** Shantell Sans, variabel. Gewicht 300–800, Achsen Bounce (`BNCE`) und Informalität (`INFM`). Keine zweite Schrift, Ausnahme ist Monospace für rohen JSON-Text im Export.
- **Lokal eingebunden, nicht von Google Fonts geladen,** damit die App offline mit Handschrift startet. Eingebettet ist eine variable WOFF (wght, INFM, BNCE; `SPAC` auf 0 festgesetzt), reduziert auf Latein mit Umlauten, typografischen Anführungszeichen, Halbgeviertstrich, Pfeilen ↑↓→, ≤ ≥ und Ø. Sie ist rund 230 KB groß. ✦ und ✕ fehlen im Font, dafür gibt es Icons. Lizenz: SIL OFL, `OFL.txt` liegt bei.
- Überschriften laufen mit `"BNCE" 40, "INFM" 55`, Fließtext mit `"BNCE" 15, "INFM" 20`.
- **Zahlen:** `font-variant-numeric: tabular-nums` mit `"BNCE" 0, "INFM" 30`. Ziffern hüpfen also nicht, und Spalten stehen gerade.

| Stufe | Größe / Zeile | Gewicht | Verwendung |
| --- | --- | --- | --- |
| `text-display` | 34 / 38 | 800 | App-Titel im Marker, einmal pro Ansicht |
| `text-title` | 24 / 30 | 700 | Sheet-Titel, kompakte AppBar |
| `text-heading` | 19 / 26 | 650 | Kartentitel, Monat im Wochenstreifen, Uhrzeit in Eintragszeilen |
| — (Unterüberschrift) | 17 / 24 | 650 | Abschnitte in Karten („Pausen“, „Uhrzeiten“), Nachfrage-Titel |
| `text-body` | 16 / 24 | 400 | Fließtext, Eingaben (mind. 16 px gegen Zoom auf iOS) |
| `text-label` | 15 / 20 | 600 | Buttons, Tabs, Feldbeschriftungen, Zieltext |
| `text-caption` | 13 / 18 | 450 | Metadaten, Hinweise, Legende, Diagramm-Info |
| `text-number` | 32 / 36 | 700 | Zähler |
| — (Kennzahl) | 24 / 30 | 700 | Kennzahl in Übersichtskarten („Ø 7,4/Tag“) |
| — (Achsen) | 11 | 400 | Achsen- und Tick-Beschriftung in Diagrammen |

- Nie Großbuchstaben-Zeilen.
- Lange Namen in Karten brechen auf höchstens zwei Zeilen um (Line-Clamp) statt abgeschnitten zu werden.

---

## 4. Formen und Handzeichnung

- **Ecken** sind nie ganz gleichmäßig. Aus `radius-sm` (6), `radius-md` (14) und `radius-lg` (20) werden unregelmäßige Ecken abgeleitet (`--kl-wobble-sm/md/lg`). Eigene Elemente nutzen diese Variablen statt eines runden Radius. `radius-full` nur für Toggle, Fortschrittsbalken und runde Knöpfe.
- **Linien** sind wellig: Trenner, Listentrenner, Navigationskante und Sheet-Griff nutzen die Wellenmaske `--kl-wave`.
- **Textmarker** (`Mark`) liegen schräg (`tilt-left`, leicht geschert) hinter kurzem Text: Titel, Zeitbezug („heute“, „diese Woche“), Typ einer Karte („pro Tag“).
- **Hand-Kringel:** Das heutige Datum im Wochenstreifen ist von einem leicht schiefen Tintenkreis umrandet (`stroke-hand`, rotiert −8°). Gewählte Elemente bekommen einen schrägen Marker-Klecks dahinter.
- **Neigung:** Karten in ruhigen Übersichten dürfen abwechselnd `tilt-left`/`tilt-right` liegen. Karten mit Bedienelementen (Zähler, Tabs, Diagramme) liegen gerade. Klebezettel und Toasts liegen bei `tilt-note`. Ein angehobenes Element beim Umsortieren kippt leicht (`tilt-left`).
- **Striche:** `stroke-hair` (1 px) für Deko, `stroke-hand` (1,5 px) für Bedienelemente und Icons, `stroke-bold` (2 px) für Checkbox, Primär-Button und Hervorhebungen.
- **Schatten** nur für Schwebendes: `shadow-paper` für Zettel, Toast und angehobene Karten, `shadow-sheet` für Sheets.

---

## 5. Raster und Layout

| Token | Wert | Verwendung |
| --- | --- | --- |
| `space-1` | 4 | Icon zu Text |
| `space-2` | 8 | In Bedienelementen, zwischen Tags |
| `space-3` | 12 | Zwischen Feldern in Sheets, Listeneinträgen |
| `space-4` | 16 | Karten-Innenabstand, Seitenrand |
| `space-5` | 20 | Zwischen Karten |
| `space-6` | 24 | Zwischen Abschnitten |
| `space-8` | 32 | Über Ansichtstiteln, unter dem letzten Element |

- **Mobile first,** Referenzbreite 390 px. App-Rahmen `.kl-app` mit max. 560 px, zentriert. Die BottomNav ist ebenfalls auf 560 px begrenzt und zentriert.
- **Seitenrand mit Safe-Area:** `--gutter-l/r: max(space-4, env(safe-area-inset-left/right))` gilt für Ansicht, AppBar und Sheets. Was am Rand fixiert ist, addiert den jeweiligen Inset.
- **Aufbau einer Hauptansicht:** `AppBar` (groß, Titel im Marker, Untertitel mit ✦) → Inhalt in Karten (`kl-stack`, Abstand `space-5`) → `Rule heart` als Abschluss mit Fußzeile und `SaveStatus` → feste `BottomNav`.
- **Navigation:** BottomNav mit 3–5 Bereichen, je ein Wort und ein Icon. Bei Daily Tally sind das „Zählen“ (list), „Verlauf“ (chart) und „Mehr“ (menu). Unter drei Bereichen gibt es Tabs statt Navigation. Export, Import und Löschen liegen im Bereich „Mehr“.
- **Touch-Ziele** mindestens 44 px, Listenzeilen 56 px, Zähler-Wertfeld 52 px hoch.
- **Raster-Kinder** bekommen `min-width: 0`, damit breiter Inhalt (Wochenstreifen, Diagramme) die Seite nicht seitlich verbreitert. Seitliches Scrollen gibt es nur in eigenen Containern.
- **Seitlich scrollende Bereiche** haben einen eigenen Container. Die Seite selbst scrollt nie horizontal.

---

## 6. Hell und Dunkel

- Thema „Tag“ (hell) und „Nacht“ (dunkel) mit denselben Token-Namen: dunkles Papier, gedämpfte Pastelle, helle Tinte.
- Umschalten **ohne JavaScript** über die Tokens. Alle Tokens stehen zuerst auf `:root`, die dunklen Werte unter `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` und nochmals unter `:root[data-theme="dark"]`, jeweils mit `color-scheme: dark`. So greift ein ausdrücklich gesetztes `data-theme` in beide Richtungen, und ohne Attribut folgt die App dem System.
- `body` hat immer einen expliziten `paper`-Hintergrund.
- Keine Komponente nutzt feste Farbwerte. Alles kommt über Tokens, auch SVG-Füllungen in Diagrammen.

---

## 7. Bewegung

Alle Dauern sind zentrale CSS-Variablen, und JavaScript liest sie von dort (`cssMs('--dur-…')`).

| Token | Wert | Wofür |
| --- | --- | --- |
| `--kl-ease` | cubic-bezier(.3, .7, .4, 1) | Federndes Ausrollen, Standard für alles |
| `--ease-in` | cubic-bezier(.45, 0, .9, .55) | Ausblenden (Sheet schließt) |
| `--dur-fast` | 120 ms | Button-Druck, Hover |
| `--dur-mid` | 200 ms | Ausweichen beim Umsortieren, Ablegen, Kartenwechsel |
| `--dur-sheet-in` | 280 ms | Sheet fährt ein, Zurückfedern nach kurzem Zug |
| `--dur-sheet-out` | 220 ms | Sheet fährt aus – für **alle** Wege zum Schließen gleich |
| `--dur-week` | 340 ms | Wochenwechsel per „Heute“ (immer genau eine Woche) |
| `--dur-longpress` | 450 ms | Halten bis zum Anheben beim Umsortieren |
| `--dur-toast` | 5000 ms | Sichtdauer eines Toasts (Rückgängig-Fenster) |

- Kurz und federnd: Das Häkchen wird gezeichnet, der Zähler hüpft (`kl-bump`, 250 ms), der Toggle-Knopf rollt, das Sheet gleitet hoch.
- **Gleiche Strecke, gleiche Dauer:** Sprünge über große Distanzen werden nicht als lange Scrollfahrt animiert. Gezeigt wird ein einzelner Schritt, etwa alte Woche → aktuelle Woche, egal wie weit entfernt.
- **Nichts springt:** Beim Ablegen gleitet ein Element von der Fingerposition an seinen Platz (FLIP). Ausweichende Elemente stehen beim Loslassen schon richtig und werden ohne Übergang zurückgesetzt.
- Keine Endlos-Animation außer dem wippenden Stift bei „speichert …“.
- `prefers-reduced-motion` schaltet alle Animationen ab, auch Sheet, Wochenwechsel und Zähler-Hüpfen.

---

## 8. Komponenten (Basis aus Fassung 1)

Icon, Mark, Button (primary · secondary · ghost · danger · fab), Card, Checkbox, Rule, ListRow, Field, Input, Textarea, Toggle, Tabs, AppBar, BottomNav, Counter, Progress, Tag, Note, Toast, SaveStatus, Sheet. Die Regeln aus Fassung 1 gelten weiter, zum Beispiel: ein Primary pro Ansicht, Ghost für leise Aktionen, Danger nur für Löschen, Tabs mit einem Wort, die AppBar scrollt mit.

**Icons:** handgezeichnete Strich-Icons, 24×24, `currentColor`, Strich 1,8, runde Enden, keine Füllung. Vorhanden: plus, minus, check, close, heart, sparkle, star, moon, chevron-right/left/down, menu, more, trash, edit, undo, search, calendar, clock, home, list, chart, sliders, download, upload, alert, clip. Allein stehende Icons nur in Icon-Buttons mit `label`. Das **Stift-Icon** (edit) markiert Text, der selbst ein Knopf ist (Name → Bearbeiten, Uhrzeit → Zeit ändern). Das **Kalender-Icon** markiert eine Überschrift, die einen Datumswähler öffnet.

---

## 9. Muster (neu in Fassung 2)

### 9.1 Zähler-Karte (Item-Karte)

- Pastellkarte, gerade (nicht gekippt). Oben links ein kleiner Marker mit dem Bezug („heute“, „Fr, 16. Okt“, „diese Woche“, „Woche vom 13. Okt“, „diesen Monat“, „September 2026“), darunter der Name als Knopf mit Stift (öffnet Bearbeiten). Rechts daneben der Zähler.
- **Zähler:** Minus (secondary, Icon) · Wert · Plus (primary, Icon). Das Wertfeld hat eine **feste Breite** (`--counter-w: 64px`), damit sich bei 0–99 nichts verschiebt. Das gilt auch für die Beschriftung darunter („Eintrag“/„Einträge“, punktiert unterstrichen = antippbar → Eintragsliste). Minus ist bei 0 deaktiviert.
- Darunter, falls ein Ziel existiert: Zieltext („höchstens 8 pro Tag“) links, Status-Tag rechts, darunter ein Fortschrittsbalken in der Markerfarbe der Karte.
- **Status-Tags:** „im Rahmen“ (success, Häkchen), „1 überschritten“ (danger, Warndreieck), „noch 2“ (butter, Uhr), „erreicht“ / „erreicht +2“ (success, Häkchen). Ein Wert genau am Höchstwert ist kein negativer Zustand.
- Optional ein Pausen-Zähler: Uhr-Icon mit „Pause seit 9 h 40 min“ links, rechts „Ziel 12 h“ oder der Tag „Ziel erreicht“, darunter ein Balken. Ist der Wert unbekannt, steht dort „Pause unbekannt“ mit einer Begründung in Caption-Größe, nie eine erfundene Zahl.
- **Fortschrittsbalken ohne sichtbares Label** (`Bar`). Der Wert steht als Text daneben, das Label nur für Screenreader. Der Balken ist voll, sobald das Ziel erreicht oder überschritten ist.

### 9.2 Seltene Aktion „Neues …“

- Wird eine Aktion selten gebraucht, steht sie als breiter Secondary-Button **unter der Liste**, nicht als schwebender FAB. Darunter folgt ein Hinweis in Caption-Größe (z. B. zum Umsortieren).
- Den FAB gibt es nur für Ansichten, deren Hauptzweck das Anlegen ist.
- Ist die Liste leer: Note-Zettel mit Beispiel und darunter ein Primary-Button („Erstes Item anlegen“).

### 9.3 Umsortieren per langem Drücken

1. **Drücken:** Ruht der Finger 90 ms, wird die Karte hervorgehoben (leicht verkleinert auf 0,985, Rahmen 2 px `line-strong`). Wischen innerhalb dieser Zeit zeigt nichts an, es flackert also nicht beim Scrollen.
2. **Halten (450 ms):** Die Karte hebt sich: Skalierung 1,03, kippt um `tilt-left`, Rahmen 2 px `ink`, `shadow-paper`, kurzes Vibrieren.
3. **Ziehen:** Die Karte folgt dem Finger, die anderen weichen um Kartenhöhe plus Abstand aus (`--dur-mid`). Am oberen und unteren Rand scrollt die Liste mit.
4. **Loslassen:** Die Karte gleitet an ihren Platz, Skalierung und Neigung bilden sich zurück.

- Ein kurzer Klick bleibt ein normaler Klick (z. B. Bearbeiten). Nach dem Ziehen wird der Klick unterdrückt.
- Text in sortierbaren Karten ist nicht markierbar, und Kontextmenüs sind aus.
- Zählknöpfe starten kein Umsortieren.

### 9.4 Sheet (Eingabe von unten)

- Fährt von unten ein über `scrim`. Papier `paper`, oben Griff (Welle), Titel in `text-title`.
- **Eingabe-Sheets sind hoch** und lassen oben nur einen Spalt (`--sheet-top-gap`: 20 px bzw. Safe-Area + 12). Die **Aktionen stehen oben**, direkt unter dem Titel: links „Abbrechen“ (secondary), rechts die Hauptaktion (primary), gleich breit. **Alle Eingabefelder liegen in der oberen Bildschirmhälfte,** damit die Tastatur nichts verdeckt. Dafür werden Felder kompakt gesetzt: Label und Steuerelement in einer Zeile, wo es geht („Zählen pro [Tag | Woche | Monat]“), Zahlenfelder 56–64 px breit, Feldabstand `space-3`.
- Hinweise erscheinen nur, wenn sie gebraucht werden (z. B. der Zeichenzähler ab 30 von 40 Zeichen).
- Beim Anlegen bekommt das erste Feld **nach** dem Einfahren den Fokus, damit Sheet und Tastatur nicht gleichzeitig animieren. Beim Bearbeiten gibt es keinen Autofokus.
- **Schließen:** Abbrechen, Tipp auf die Abdunklung, Escape oder Herunterziehen am Griff (Griffzone = Griff plus Titelzeile). Alle Wege nutzen dieselbe Ausblend-Animation.
- **Herunterziehen:** Das Sheet folgt dem Finger pixelgenau, die Abdunklung wird heller, die Tastatur schließt. Loslassen nach mehr als 25 % der Höhe oder nach einem schnellen Wisch nach unten (> 0,5 px/ms) schließt, sonst federt es zurück. Ziehen, das auf einem Knopf beginnt, zieht nicht.
- Kurze Sheets (Eintragsliste, Export, Import) sind so hoch wie ihr Inhalt, höchstens bis zum oberen Spalt. Der Inhalt scrollt im Sheet, der Griff bleibt stehen.

### 9.5 Nachfrage und Bestätigung im Sheet (statt Dialog)

- Es gibt keine Browser-Dialoge (`confirm`, `alert`). Nachfragen erscheinen **innerhalb** des Sheets oder der Ansicht.
- **Entscheidung** (z. B. „Ziel geändert – ab wann gilt es?“): Feld in `tint-butter` mit Titel (17 px, 650), einer Zeile Erklärung in Caption und zwei Buttons. Die empfohlene Wahl ist primary und bekommt den Fokus, Enter wählt sie.
- **Gefährlich** (Löschen): zuerst ein Danger-Button mit Mülleimer. Nach dem ersten Tipp erscheint ein Feld in `danger-soft` mit `danger`-Rahmen, das in einem Satz sagt, was verloren geht („Löscht „X“ und 123 Einträge.“). Darunter stehen „Behalten“ und „Endgültig löschen“ (danger). Bei „Alle Daten löschen“ kommt „Erst exportieren“ als Alternative dazu.
- Einzelne Einträge werden ohne Rückfrage gelöscht, danach kommt ein Toast mit „Rückgängig“ (5 s).

### 9.6 Hinweis-Leiste (Banner)

- Für Zustände, die man nicht übersehen darf, etwa „Speichern nicht möglich“ oder einen ungültigen Import: `danger-soft`-Fläche, `danger`-Rahmen (stroke-hand), Warndreieck in `danger`, Text in `ink`, Anfang fett.
- Kein Zettel: Fehler stehen nie auf einem Note.

### 9.7 Toast

- Schräger Klebezettel (`sticky`, `tilt-left`), unten über der Navigation, max. 360 px, mit Icon links und optional einer Ghost-Aktion („Zeit ändern“, „Rückgängig“). Ein Schließen-× gehört dazu.
- Es gibt immer nur einen Toast, sichtbar für `--dur-toast`. Mehrere Informationen werden mit „·“ verbunden („Erfasst 14:32 · Pause beendet: 9 h 40 min“).

### 9.8 Wochenstreifen (Tagesauswahl)

- Eine Woche Mo–So in sieben gleich breiten Spalten. Je Tag: Wochentag (Caption, `ink-muted`) und Datum (19 px, 650, tabellarisch).
- **Gewählt:** schräger Klecks in `mark-rose` hinter dem Tag. **Heute:** Hand-Kringel um die Zahl. **Künftig:** 35 % Deckkraft, nicht wählbar. **Mit Einträgen:** kleiner Tintenpunkt (5 px) unter der Zahl.
- **Kopfzeile:** Monat der sichtbaren Woche als Überschrift mit Kalender-Icon („Oktober 2026“, über Monatsgrenzen „Sept – Okt 2026“, über Jahresgrenzen „Dez 2026 – Jan 2027“). Antippen öffnet den Datumswähler des Systems. Rechts steht der kleine Button „Heute“, inaktiv, wenn heute schon gewählt und sichtbar ist. Mit Maus gibt es zusätzlich Pfeile (Ghost, nur bei `pointer: fine`).
- Wischen rastet immer genau eine Woche weiter (Scroll-Snap mit `scroll-snap-stop: always`). „Heute“ zeigt aus jeder Entfernung nur den Schritt alte Woche → aktuelle Woche (`--dur-week`).

### 9.9 Native Wähler hinter Anzeigen (Datum, Uhrzeit)

- Datum und Uhrzeit werden über die **Wähler des Systems** gewählt (`<input type="date">` / `type="time">`; auf Android der Material-Kalender bzw. die Uhr). Keine eigenen Kalender- oder Uhr-Widgets.
- Sichtbar ist die **Anzeige** in Kladde-Optik: „14:32“ mit Stift-Icon, „Oktober 2026“ mit Kalender-Icon. Darüber liegt das unsichtbare Eingabefeld (Deckkraft 0, volle Fläche, 16 px Schrift). Auf Touch-Geräten öffnet schon das Antippen den Wähler.
- Mit Maus ruft ein Klick `showPicker()` auf. Ist das gesperrt (eingebettete Vorschau in einem fremden iframe), wird das Feld **sichtbar** eingeblendet: `paper-raised`, `line-strong`-Rahmen, an derselben Stelle.
- **Kein Bestätigen-Schritt:** Eine gewählte Zeit wird sofort übernommen. „Löschen“ im Wähler entfernt die Uhrzeit, der Eintrag gilt dann als „ohne Uhrzeit“. Ungültiges (z. B. Zukunft) wird abgelehnt: Fehlerzeile mit Warndreieck darunter, die Anzeige springt zurück.
- Fokus wird über `focus-within` am Anzeige-Element gezeigt.

### 9.10 Listen mit Einträgen

- `kl-list` mit welligen Trennern, Zeilen 56 px: Icon-Kachel links (36 px, getönt), Hauptinhalt, Aktionen rechts als Ghost-Icon-Buttons.
- Mehrere Tage werden gruppiert, mit Tagesüberschrift in Label-Größe (`ink-muted`, „Mi, 14. Okt“). Sortiert ist nach Uhrzeit, Einträge ohne Uhrzeit stehen am Ende in `ink-muted`.

### 9.11 Menü („Mehr“)

- Eine `paper`-Karte. Kopf: Abschnittstitel links, `SaveStatus` rechts. Darunter in Caption der Datenstand („5 Items · 14 732 Einträge auf diesem Gerät“). Dann eine `kl-list` mit `ListRow`s (Icon-Kachel in Pastell, Titel, Meta, Pfeil): Exportieren (mint, download), Importieren (sky, upload), Alle Daten löschen (peach, trash).
- Die Liste ist so angelegt, dass weitere Zeilen dazukommen können.
- **Export-Sheet:** zwei gleichwertige Wege, „Datei speichern“ (primary) und „Kopieren“ (secondary). Darunter leise „Als Text anzeigen“: markierbares Monospace-Feld, falls Download und Zwischenablage blockiert sind.
- **Import-Sheet:** „Datei wählen“ (primary, volle Breite) oder „Oder Text einfügen“ (Textfeld, Monospace) plus „Text prüfen“. Danach folgt immer eine Nachfrage mit Zahlen („… durch 5 Items und 1 234 Einträge ersetzen?“) und dem erkannten Format.

### 9.12 Speicherstatus

- `SaveStatus` steht in der Fußzeile der Hauptansicht und im Menü-Kopf: „gespeichert“ (success, Häkchen) oder „nicht gespeichert“ (danger, Warndreieck).
- Ist der Speicher nicht verfügbar, erscheint zusätzlich oben eine Hinweis-Leiste (9.6) mit dem Rat zu exportieren.

---

## 10. Diagramme

- **Form:** Ein Verlauf ist eine **geglättete Linie** über **dezenten Einzelpunkten**, keine Balken. Balken bzw. Säulen gibt es nur für Verteilungen (z. B. Anteil je Tagesstunde).
- **Linie:** `ink`, 2,2 px, runde Enden. Sie ist ein **zentrierter** gleitender Durchschnitt mit Nachbarn links und rechts: ±3 Tage, ±1 Woche, ±1 Monat. Am Rand mittelt sie über die vorhandenen Werte. Nachlaufende Durchschnitte sind tabu, sie hinken den Punkten hinterher.
- **Einzelpunkte:** `ink-muted` mit 45 % Deckkraft, Radius 3 px (2 px bei engem Abstand). Unbekannte Werte erscheinen gar nicht, nie als 0.
- **Vorläufig** (laufender, unvollständiger Zeitraum): hohler Punkt (`paper-raised` gefüllt, `ink-muted`-Rand), das letzte Linienstück gestrichelt (3/4), in der Info „(vorläufig)“.
- **Ziel als Hilfslinie:** `line-strong`, 1,5 px, gestrichelt (6/4), als **Stufenlinie** entlang des Zielverlaufs, mit Lücken, wo kein Ziel galt. In der Legende erscheint „Ziel“ nur, wenn es eine Ziellinie gibt.
- **Achsen:** **keine Kommazahlen.** Ganzzahlige Schritte (1, 2, 5, 10, 20, 50 …) für höchstens etwa drei Intervalle, das Maximum ist ein Vielfaches des Schritts (z. B. 0 · 5 · 10 · 15). Stunden-Achsen tragen „h“ (0 h · 10 h · 20 h), Uhrzeit-Achsen zeigen nur volle Stunden (z. B. 6:00 · 8:00 · 10:00). Beschriftung 11 px in `ink-muted`, Gitterlinien in `line`.
- **Einheit** steht über dem Diagramm in Caption („pro Tag“, „pro Woche“, „Stunden“, „Uhrzeit“). Sie bleibt bei jeder Auflösung gleich, gröbere Auflösungen zeigen Durchschnitte in derselben Einheit, damit die Ziellinie vergleichbar bleibt.
- **Viele Punkte:** Passen sie nicht mit mindestens 8 px Abstand in die Breite, scrollt der Plot horizontal und **startet am rechten Ende** (heute). Umgesetzt mit `direction: rtl` am Scrollbereich und `ltr` am SVG, das funktioniert auch, wenn das Diagramm unsichtbar erzeugt wurde. Die Y-Achse ist ein eigenes SVG daneben und scrollt nicht mit.
- **X-Beschriftung:** Tage „17.10.“, Wochen „6. Okt“, Monate „Okt“ (im Januar mit Jahr: „Jan 27“). Von rechts aus mindestens 84 px Abstand, damit nichts überlappt.
- **Antippen** eines Punkts: Eine gestrichelte senkrechte Hilfslinie und ein hervorgehobener Punkt erscheinen (5 px, `paper-raised`, `ink`-Rand). In der Infozeile unter dem Diagramm stehen Zeitraum (fett), Wert und das damals geltende Ziel. Ohne Auswahl zeigt die Infozeile die Legende (Strich = Trend, gestrichelt = Ziel, Punkt = „Punkt antippen für Details“).
- **Auflösung** per Tabs über dem Diagramm (Tag · Woche · Monat). Sie wird je Diagramm im Browser gemerkt. Gibt es nur eine sinnvolle Auflösung, entfallen die Tabs.
- **Übersichtskarte:** Kopfzeile mit Name links (Titel, einzeilig gekürzt) und Typ-Marker rechts („pro Tag“). Darunter die Kennzahl (24 px) mit Richtungspfeil und Vergleichswert („Ø 7,4/Tag ↑ von 6“) und in Caption der Zeitraum („letzte 7 Tage“). Es folgen Diagramme, weitere Abschnitte mit Unterüberschrift (17 px).
- Diagrammhöhe 150 px (`--chart-h`), Achsenbreite 40 px (`--chart-axis-w`).

---

## 11. Barrierefreiheit

- **Kontrast:** Text mindestens 4,5:1 auf seinem Grund in beiden Themen. Bedienrahmen, Fokusring, Icons und Diagrammlinien mindestens 3:1.
- **Fokus:** Jedes Bedienelement zeigt `focus-ring` (2 px Papierlücke, 2 px Tinte). Unsichtbare Eingabefelder zeigen ihn am sichtbaren Anzeige-Element.
- **Bedeutung nicht nur über Farbe:** Status immer mit Wort und Icon. Unterscheidbare Farben unterscheiden sich in der Helligkeit.
- **Screenreader:** Icon-Buttons haben `label`, Tage im Streifen ausführliche Labels („Sa, 17. Okt, heute, mit Einträgen“), Balken `role="progressbar"`, Diagramme eine Kurzbeschreibung, Infozeilen und Monat `aria-live="polite"`. Geparkte Ansichten sind `aria-hidden`.

---

## 12. Umsetzung in einer neuen App

1. `tokens.json`, `kladde.css`, `kladde.js` (ES-Modul) und die lokale Schrift (`ShantellSans-var.woff` + `fonts.css`) übernehmen. Danach `tokens.css` mit `scripts/tokens-to-css.mjs` erzeugen.
2. App-Bausteine aus `app.css` nach Bedarf übernehmen: Sheet, Banner, Wochenstreifen, Diagramm, Umsortieren, Picker-Überlagerung. App-eigene Maße und Dauern stehen als Variablen oben in `app.css`.
3. Neue Bausteine entstehen aus denselben Tokens und Formen: wellige Ecken, Marker, Wellenlinien. Keine festen Werte im Code, keine zweite Schrift, keine neuen Farben ohne Token.
4. Wiederverwendbare Komponenten aus Daily Tally: `DragSheet`, `ReorderList`, `TrendChart`, `HourChart`, `Bar`, `WeekStrip`, Picker-Helfer (`picker.js`), gemerkte Anzeige-Einstellungen (`prefs.js`).

---

## 13. Änderungen gegenüber Fassung 1

| Bereich | Fassung 1 | Fassung 2 |
| --- | --- | --- |
| Schrift laden | Google Fonts | Lokal eingebunden, variabel, auf Latein reduziert (offline) |
| Hell/Dunkel | JS setzt `data-theme` per `matchMedia` | Reines CSS über Token-Blöcke, `data-theme` wirkt als Übersteuerung |
| Farbvergabe | Feste Bedeutungen je Ton | In Listen nach Position im Zyklus, Bedeutungen nur bei echten Kategorien |
| Sheet | Bis 88 % Höhe, Aktionen am Ende | Eingabe-Sheets hoch mit Aktionen oben, alle Felder in der oberen Bildschirmhälfte, Ziehen zum Schließen mit festen Schwellen |
| Bestätigungen | Lieber Rückgängig statt Nachfrage | Rückgängig für Einzeleinträge; Nachfrage im Sheet für Folgenreiches (Ziel ab wann, Item löschen, alles löschen) |
| Neues anlegen | FAB unten rechts | FAB nur, wenn Anlegen Hauptzweck ist; sonst Button unter der Liste |
| Counter | Wert ohne feste Breite | Feste Breite (64 px), keine Verschiebung bei 0–99; Wert antippbar |
| Progress | Label sichtbar oben | Zusätzlich `Bar` ohne sichtbares Label |
| Bewegung | Dauern 120–300 ms | Benannte Dauern als Variablen inkl. Langdruck, Wochenwechsel, Toast; „gleiche Strecke, gleiche Dauer“; Ablegen per FLIP |
| Datum/Uhrzeit | Native Felder im Formular | Native Wähler hinter Kladde-Anzeigen, sofortige Übernahme, Löschen = ohne Uhrzeit |
| Diagramme | nicht festgelegt | Abschnitt 10: Linie + Punkte, zentrierte Glättung, Ziel-Stufenlinie, ganzzahlige Achsen, Scroll von rechts |
| Neue Muster | – | Zähler-Karte, Umsortieren, Wochenstreifen, Hinweis-Leiste, Export/Import-Sheets, Status-Tags |
| Fehler | – | Hinweis-Leiste in `danger-soft`, nie auf Zetteln; immer „nichts verändert“ dazusagen |
