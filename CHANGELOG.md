# Änderungen

Was sich pro Release geändert hat, kurz und aus Sicht der Nutzung. Der Ist-Zustand steht in `claude/Funktionsbeschreibung.md`, die Regeln zum Veröffentlichen in `CLAUDE.md`.

Datenformat-Version in Klammern, wenn sie sich geändert hat – dann läuft beim ersten Start nach dem Update eine Migration.

## Unveröffentlicht

– noch nichts –

## 1.0 – 2026-11-02

Erste veröffentlichte Fassung (Datenformat 3).

- Zählen pro Tag, Woche oder Monat; Einträge mit Uhrzeit oder ohne, nachtragbar und löschbar.
- Zählziele als Höchst- oder Mindestwert, mit Verlauf („ab jetzt“ oder rückwirkend korrigiert).
- Pausenziel für Tages-Items: längste Pause am Tag, mit laufender Anzeige auf der Karte.
- Wochenstreifen zum Springen zwischen Tagen, Kalenderauswahl, Tag beginnt um 04:00.
- Verlauf: Trend seit Beginn des Items, Auflösung Tag/Woche/Monat, Pausen- und Uhrzeiten-Auswertung.
- Items umsortieren, umbenennen, löschen; Export und Import als JSON, auch aus den Prototyp-Formaten.
- Läuft offline als installierbare Web-App, alle Daten bleiben im Browser.
- Alte Datenstände werden beim Laden migriert statt verworfen; der alte Stand wird vorher gesichert.
