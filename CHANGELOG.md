# Änderungen

Was sich pro Release geändert hat, kurz und aus Sicht der Nutzung. Der Ist-Zustand steht in `claude/Funktionsbeschreibung.md`, die Regeln zum Veröffentlichen in `CLAUDE.md`.

Datenformat-Version in Klammern, wenn sie sich geändert hat – dann läuft beim ersten Start nach dem Update eine Migration.

## Unveröffentlicht

- Neuer Abschnitt „Über Daily Tally“ im Menü: App- und Datenformat-Version, ein Link zum Melden von Problemen auf GitHub und ein Buy-me-a-coffee-Knopf.
- **Items aussetzen**: für Urlaub oder bewusste Ausnahmen lässt sich ein Item für heute, bis zu einem Datum oder unbefristet aussetzen – im Item-Sheet unter „Aussetzen“, im Menü auch für alle Items zusammen. Ausgesetzte Tage zählen in keiner Auswertung mit: sie gelten als unbekannt, nicht als null, und hinterlassen im Trend eine Lücke. Der Rückweg („Aussetzen beenden“) steht auf der Karte.
- Neues Ziel **Mindestabstand**: wie viel Zeit zwischen zwei Einträgen liegen soll. Die Karte zeigt, wie lange noch zu warten ist, und zählt zu frühe Einträge. Unabhängig vom bisherigen Pausenziel – beides darf gleichzeitig gesetzt sein (z. B. 1 h zwischen Zigaretten und 12 h über Nacht). Pausenziel und Mindestabstand liegen jetzt hinter der aufklappbaren Zeile „Pausen“.
- Items haben eine Richtung: „mehr ist besser“ oder „weniger ist besser“. Bei „weniger ist besser“ zeigt die Karte groß das Restbudget statt des steigenden Zählers – und ohne Limit die Zeit seit dem letzten Eintrag. Die Knöpfe behalten ihre Bedeutung: Plus erfasst, Minus korrigiert. Bestehende Items bekommen die Richtung aus ihrem Zieltyp.

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
