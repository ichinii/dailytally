# Daily Tally – Funktionsbeschreibung

Stand: 17. Okt 2026 · @lumpenmensch

Dieses Dokument beschreibt die App so, wie sie gebaut ist – nicht nur die ursprüngliche Idee. Es ist die Referenz für neue Arbeit: Was hier steht, gilt; was hier nicht steht, ist nicht versprochen.

**Pflege:** Wer Verhalten ändert oder ergänzt, ändert diesen Text mit – im selben Commit. Neues Verhalten gehört in den passenden Abschnitt, neue Prüfpunkte unter „Abnahmekriterien“ (`[x]`, wenn der Browsertest sie abdeckt). Gestaltung steht nicht hier, sondern in `claude/Design.md`; Befehle, Dateiaufbau und Teststart in `README.md` und `CLAUDE.md`.

## Zweck und Leitprinzipien

Daily Tally ist eine mobile Web-App, mit der man zählt, wie oft bestimmte Dinge passieren – pro Tag (z. B. Zigaretten), pro Woche (z. B. Sport) oder pro Monat (z. B. Friseur) – und den Verlauf über die Zeit sieht.

- **So einfach wie möglich.** Ein Eintrag = ein Tipp. Keine Funktion, die man nicht regelmäßig braucht.
- **Ziele sind Orientierung, kein Soll.** „Höchstens 10“ heißt: alles bis 10 ist in Ordnung, 5 ist genauso gut wie 10. „Mindestens 3“ heißt: ab 3 erreicht, mehr ist ein Bonus. Die App bewertet nicht, ob der Wert möglichst nah am Ziel liegt, und setzt niemanden unter Druck. Ein Ziel erscheint in Diagrammen als Hilfslinie.
- **Ehrliche Daten.** Was unbekannt ist (z. B. die Uhrzeit eines nachgetragenen Eintrags), wird als unbekannt gespeichert und in Auswertungen weggelassen – nie mit erfundenen Werten gefüllt.
- **Alles lokal.** Daten liegen nur im Browser-Speicher des Geräts; kein Konto, kein Server. Sicherung per Export.
- **Die Übersicht zeigt pro Item nur, was zu seinen Zielen passt.** Keine zusätzlichen Einstellungen für Auswertungen.

## Begriffe und Datenmodell

Gespeichert werden einzelne Einträge mit festem Tag und optionaler Uhrzeit; alle Zahlen und Diagramme werden daraus berechnet.

- **Tag:** läuft von 04:00 bis 03:59 Ortszeit. Ein Eintrag um 01:30 gehört zum Vortag. Schlüssel im Format `YYYY-MM-DD`.
- **Woche:** Montag bis Sonntag (nach obiger Tagesdefinition). **Monat:** Kalendermonat, vom Ersten bis zum Letzten.
- **Item:** etwas, das gezählt wird. Hat einen Namen, einen Zeitraum (`day`, `week` oder `month`), ein Anlagedatum und optional ein Zählziel und ein Pausenziel. Die Reihenfolge der Items ist die Reihenfolge im Array `items` und lässt sich in der Track-Ansicht ändern.
- **Eintrag:** ein einzelnes Vorkommen. Speichert immer den Tag (`day`) und, wenn bekannt, den genauen Zeitpunkt (`ts`, Millisekunden seit 1970 UTC). Unbekannte Uhrzeit = `null`, niemals 0.
- **Zielverlauf:** Ziele werden nicht überschrieben, sondern als Liste mit Startdatum geführt (`from`). Für einen Zeitraum gilt der letzte Eintrag, dessen `from` am oder vor dem Beginn des Zeitraums liegt. `value: null` heißt „ab hier kein Ziel“. `from` ist immer ein Zeitraumbeginn: der Tag bei Tages-Items, der Montag bei Wochen-Items, der Monatserste bei Monats-Items.
- **Pausenziel-Verlauf:** gleiches Prinzip, mit `minutes` (z. B. 720 = 12 h) bzw. `null`. Nur Tages-Items haben Pausenziele; bei Wochen- und Monats-Items ist `pauseGoals` immer leer (der Import räumt das auf).

```json
{
  "version": 3,
  "items": [
    {
      "id": "c1",
      "label": "Zigaretten",
      "period": "day",
      "createdDay": "2026-10-01",
      "countGoals": [
        { "from": "2026-10-01", "type": "max", "value": 10 },
        { "from": "2026-11-01", "type": "max", "value": 8 }
      ],
      "pauseGoals": [ { "from": "2026-10-17", "minutes": 720 } ]
    },
    {
      "id": "s1",
      "label": "Sport",
      "period": "week",
      "createdDay": "2026-10-01",
      "countGoals": [ { "from": "2026-09-28", "type": "min", "value": 3 } ],
      "pauseGoals": []
    }
  ],
  "entries": [
    { "id": "e1", "itemId": "c1", "day": "2026-10-17", "ts": 1792224720000 },
    { "id": "e2", "itemId": "c1", "day": "2026-10-16", "ts": null }
  ]
}
```

Datumsrechnung läuft über Tagesnummern (Tage seit 1970, UTC-basiert), nicht über lokale `Date`-Objekte – das vermeidet Fehler bei der Sommerzeit-Umstellung. Nur `ts` ist ein echter Zeitpunkt und wird für die Anzeige in Ortszeit umgerechnet. Die 4-Uhr-Grenze ist an einer Stelle definiert (`src/lib/days.js`), Zeiträume ausschließlich über `periodStart`/`periodEnd` (`src/lib/goals.js`).

Getrennt von den Daten liegen **Anzeige-Einstellungen** (gewählte Auflösung je Item und Abschnitt, Zeitraum der Tageszeit-Verteilung) unter dem Schlüssel `daily-tally-ui`. Sie werden nicht exportiert; ein unbekannter oder veralteter Wert fällt auf den Standard zurück.

## Aufbau der App

Drei Ansichten, umschaltbar über eine feste Leiste am unteren Rand:

| Ansicht | Inhalt |
| --- | --- |
| **Zählen** | Wochenstreifen und alle Items mit den Werten des gewählten Tages |
| **Verlauf** | pro Item eine Karte mit Kennzahl, Trend und passenden Zusatz-Auswertungen |
| **Mehr** | Export, Import, „Alle Daten löschen“ |

Rückmeldungen laufen über **einen** Toast am unteren Rand (immer nur einer; der nächste ersetzt den vorherigen). Toasts können eine Aktion tragen („Zeit ändern“, „Rückgängig“). Beide Hauptansichten zeigen außerdem einen kleinen Speicherstatus („gespeichert“ / „nicht gespeichert“).

## Items anlegen und bearbeiten

Ein Item wird über einen Hinzufügen-Knopf unter der Liste angelegt (bei leerer Liste über den Knopf im leeren Zustand) und durch Antippen des Namens in der Track-Ansicht bearbeitet; beides im selben Eingabe-Sheet.

**Felder**

| Feld | Pflicht | Werte |
| --- | --- | --- |
| Name | ja | Text, max. 40 Zeichen (Hinweis ab 30 Zeichen) |
| Zeitraum | ja | pro Tag / pro Woche / pro Monat; nach dem Anlegen nicht mehr änderbar (im Bearbeiten-Modus als Marke mit Hinweis) |
| Zählziel | nein | „kein“ / „höchstens“ / „mindestens“ + ganze Zahl ≥ 1 (Vorschlag 10 bzw. 3) |
| Pausenziel | nein | Schalter + Dauer in Stunden und Minuten (Vorschlag 12 h); nur bei Tages-Items angeboten |

**Zielbewertung** (gilt überall in der App)

- „Höchstens N“: Wert ≤ N = im Rahmen (auch genau N ist kein negativer Zustand); Wert > N = überschritten, um wie viel.
- „Mindestens N“: Wert < N = offen, wie viel fehlt; Wert ≥ N = erreicht, ein Überschuss wird als Bonus angezeigt („erreicht +2“).
- Pausenziel: erreicht, wenn eine Pause ≥ Zieldauer gedauert hat (Details unter Track-Ansicht und Übersicht).

**Ziele ändern**

- Wird ein Ziel geändert, hinzugefügt oder entfernt, fragt die App einmal: **„Ab jetzt“** (Standard, vorausgewählt) oder **„Korrektur für den ganzen Verlauf“**. Nur der Name geändert → keine Nachfrage.
- „Ab jetzt“ hängt einen Eintrag an den Zielverlauf an, mit `from` = Beginn des aktuellen Zeitraums (beim Pausenziel: der heutige Tag). Frühere Zeiträume behalten ihr altes Ziel. Gibt es für diesen Beginn schon einen Eintrag, wird er ersetzt.
- „Korrektur“ ersetzt den ganzen Verlauf durch einen einzigen Eintrag ab Beginn des Items (für Tippfehler). Beginn = früherer Tag von Anlage und erstem Eintrag, auf den Zeitraumbeginn gerundet.
- Im Bearbeiten-Sheet ist der Zielverlauf als kurze Liste sichtbar, z. B. „ab 1. Okt: höchstens 10 · ab 1. Nov: höchstens 8“ – getrennt für Zählziel und Pausenziel.

**Speichern und Löschen**

- Speichern über den Knopf und über die Enter-Taste in jedem Textfeld. Speichern ist gesperrt, solange der Name leer ist. Ein fehlerhafter Zielwert oder eine Dauer von 0 wird erst beim Speichern gemeldet.
- Löschen nur im Bearbeiten-Modus, mit zweiter Bestätigung; löscht alle Einträge des Items mit und meldet „„Name“ gelöscht“.

**Verhalten der Sheets** (gilt für alle: Item, Eintragsliste, Export, Import)

- Alle Eingabefelder und der Speichern-Knopf liegen in der oberen Bildschirmhälfte, damit die Bildschirmtastatur sie nicht verdeckt.
- Das Sheet fährt ein; erst danach bekommt das Namensfeld den Fokus (Sheet und Tastatur sollen nicht gleichzeitig animieren). Beim Bearbeiten wird nicht automatisch fokussiert.
- Schließen über Abbrechen, Tipp auf den Hintergrund, Escape oder Herunterziehen am Griff.
- Herunterziehen: Das Sheet folgt dem Finger ohne Verzögerung; die Tastatur schließt beim Ziehen. Loslassen nach mehr als ca. 25 % der Höhe oder nach einem schnellen Wisch nach unten schließt, sonst federt es zurück. Ziehen, das auf einem Knopf beginnt, löst kein Ziehen aus.
- Alle Wege zum Schließen nutzen dieselbe Ausblend-Animation; Schließen ohne Speichern verändert keine Daten.

## Track-Ansicht

Die Hauptansicht besteht aus einem wischbaren Wochenstreifen zur Tagesauswahl und der Liste aller Items mit ihren Werten für den gewählten Tag. Ohne Items zeigt sie einen kurzen Hinweis, wie man das erste anlegt.

**Wochenstreifen**

- Zeigt immer genau eine Woche (Mo–So). Horizontal wischen blättert, und jeder Wisch rastet auf **genau eine Woche** weiter – auch ein kräftiger Wisch überspringt keine Woche. Ein kurzer, langsamer Zug federt zur aktuellen Woche zurück. Nie zwischen zwei Wochen stehen bleiben.
- Reicht vom frühesten Eintrag bzw. der frühesten Item-Anlage, mindestens aber 52 Wochen zurück, bis zur aktuellen Woche. Nur Wochen nahe der sichtbaren werden gerendert.
- Jeder Tag zeigt Wochentag und Datum. Der gewählte Tag ist hervorgehoben, heute ist erkennbar markiert, künftige Tage sind deaktiviert. Tage mit mindestens einem Eintrag (irgendeines Items) tragen eine kleine Markierung.
- Antippen wählt den Tag; der Streifen bewegt sich dabei nicht.
- Kopfzeile: Monat der sichtbaren Woche („Oktober 2026“; über eine Monatsgrenze „Sept – Okt 2026“, über eine Jahresgrenze mit beiden Jahren) und ein **Heute-Knopf**. Dieser wählt heute und springt zur aktuellen Woche. Sind beide Bedingungen schon erfüllt, wirkt er inaktiv. Egal wie weit zurück gesprungen wird: Die Animation zeigt immer genau einen Wochenschritt (Überblendung über die Zielwoche); bei „Bewegung reduzieren“ entfällt sie.
- **Kalender:** Ein Tipp auf die Kopfzeile öffnet den Datumswähler des Systems (Touch: das unsichtbare Datumsfeld selbst, Maus: `showPicker()`; ist das gesperrt – z. B. in fremden iframes –, wird das Feld sichtbar). Der gewählte Tag wird auf den Bereich des Streifens begrenzt, ausgewählt und angesprungen.
- Geräte mit Maus bekommen zusätzlich Pfeile für vorige/nächste Woche; auf Touch-Geräten ausgeblendet.
- Kommt man aus einer anderen Ansicht zurück, steht der Streifen auf der Woche des gewählten Tages. Bei Größenänderung (Drehen) bleibt er an der Woche ausgerichtet.
- Beginnt um 04:00 ein neuer Tag, während die App offen ist und „heute“ gewählt war, wechselt die Auswahl auf den neuen Tag (Prüfung alle 30 s und beim Zurückkehren in den Vordergrund).

**Item-Zeilen**

- Zeigen Name, Bezug („heute“ bzw. das Datum; bei Wochen-Items „diese Woche“ bzw. „Woche vom …“, bei Monats-Items „diesen Monat“ bzw. „Oktober 2026“), den Wert des Zeitraums, das für **diesen** Zeitraum geltende Ziel samt Status (laut Zielverlauf) und einen Fortschritt zum Ziel.
- Wert: Summe der Einträge im Zeitraum, der den gewählten Tag enthält (Tag, Woche oder Monat). Ändert sich der Wert, hüpft die Zahl kurz.
- **Plus** legt einen Eintrag am gewählten Tag an. Ist der gewählte Tag heute, wird `ts` = jetzt gespeichert, sonst `ts` = `null`. Fällt der Tageswechsel genau in diesen Moment, wird auf den neuen Tag gebucht.
- **Minus** entfernt den zuletzt angelegten Eintrag des gewählten Tages. Bei Wochen- und Monats-Items, wenn der gewählte Tag keinen hat: den zuletzt angelegten Eintrag des Zeitraums. Bei Wert 0 deaktiviert.
- Nach Plus am heutigen Tag erscheint kurz ein Toast „Erfasst 14:32“ mit der Aktion „Zeit ändern“, die die Eintragsliste mit direkt geöffneter Zeitauswahl für diesen Eintrag zeigt. Hatte das Item ein Pausenziel und war die laufende Pause bekannt, steht zusätzlich „Pause beendet: 9 h 40 min“ im selben Toast.
- Antippen des Item-Namens öffnet das Bearbeiten-Sheet.

**Umsortieren**

- Ein Item lässt sich durch **langes Drücken** (ca. 0,45 s) anheben und dann mit dem Finger an eine andere Stelle ziehen; die anderen Items weichen aus, beim Ablegen gleitet das Item an seinen Platz. Kurzes Tippen bleibt ein normaler Klick.
- Das Drücken auf den Zählknöpfen oder in Eingabefeldern hebt nichts an. Bewegt sich der Finger vor dem Anheben mehr als ca. 8 px, gilt es als Scrollen und das Anheben wird abgebrochen.
- Die Seite scrollt erst nach dem Anheben nicht mehr; nahe am Rand scrollt sie beim Ziehen automatisch mit. Ein kurzes Vibrieren bestätigt das Anheben, falls das Gerät es kann.
- Die Reihenfolge gilt in beiden Ansichten (Track und Verlauf) und wird mitgespeichert. Unter der Liste steht ein Hinweis, wie es geht.

**Einträge eines Zeitraums**

- Antippen des Werts öffnet die Liste der Einträge des Zeitraums (bei Wochen- und Monats-Items nach Tagen gruppiert, innerhalb eines Tages nach Uhrzeit; Einträge ohne Uhrzeit zuletzt): je Eintrag die Uhrzeit oder „ohne Uhrzeit“.
- Die Uhrzeit-Anzeige ist selbst der Knopf: Darüber liegt ein unsichtbares Uhrzeit-Feld, das die **Zeitauswahl des Systems** öffnet. Eine gewählte Uhrzeit wird sofort übernommen – kein zusätzliches Bestätigen. Lässt sich die Auswahl nicht per Code öffnen, wird das Feld sichtbar.
- Erlaubt sind nur Zeiten im Fenster des Eintragstags (04:00 bis 03:59 des Folgetags – Stunden vor 4 landen automatisch am Folgetag) und nicht in der Zukunft; eine künftige Zeit wird mit „Diese Uhrzeit liegt in der Zukunft.“ abgelehnt und nichts geändert.
- „Löschen“ im Zeitwähler (leere Uhrzeit) macht aus dem Eintrag wieder einen ohne Uhrzeit.
- Pro Eintrag gibt es einen Löschknopf. Gelöschte Einträge lassen sich über den Toast „Rückgängig“ an ihrer alten Stelle wiederherstellen (solange das Item noch existiert).

**Pausen-Zähler** (nur Tages-Items mit Pausenziel, nur wenn heute gewählt ist)

- Zeigt die laufende Pause seit dem letzten Eintrag: „Pause seit 9 h 40 min“, das Ziel und den Fortschritt dazu. Ist das Ziel erreicht, läuft der Zähler weiter und zeigt „Ziel erreicht“.
- Aktualisiert sich mindestens jede Minute.
- Die laufende Pause ist nur bekannt, wenn der neueste Eintrag des Items eine Uhrzeit hat und zwischen dessen Tag und heute kein Tag mit einem Eintrag ohne Uhrzeit liegt. Sonst zeigt der Zähler „Pause unbekannt“ mit dem Grund („Der letzte Eintrag hat keine Uhrzeit.“ bzw. „Noch kein Eintrag mit Uhrzeit.“), statt eine Zahl zu erfinden.

## Verlauf (Übersicht)

Die Übersicht zeigt pro Item eine Karte mit Kennzahl und Trendverlauf ab Beginn der Aufzeichnung; weitere Auswertungen erscheinen nur, wenn sie zum Item passen. Reihenfolge der Karten wie in der Track-Ansicht.

**Kennzahl mit Richtung** (jedes Item)

- Tages-Item: Durchschnitt pro Tag der letzten 7 abgeschlossenen Tage, verglichen mit den 7 Tagen davor, z. B. „Ø 8,2/Tag · ↓ von 9,5“.
- Wochen-Item: Durchschnitt pro Woche der letzten 4 abgeschlossenen Wochen, verglichen mit den 4 davor.
- Monats-Item: Durchschnitt pro Monat der letzten 3 abgeschlossenen Monate, verglichen mit den 3 davor.
- Nur der Vergleich, keine Bewertung. Der Vergleichswert erscheint nur, wenn der Vorzeitraum vollständig im Datenbereich liegt; sonst nur der Durchschnitt. Ohne abgeschlossenen Zeitraum: „Noch kein abgeschlossener Zeitraum.“

**Trendverlauf** (jedes Item)

- Zeitraum: vom Beginn des Items (früherer Tag von Anlage und erstem Eintrag) bis heute. Tage ohne Eintrag ab Beginn zählen als 0.
- Auflösung umschaltbar: Tages-Items Tag / Woche / Monat, Wochen-Items Woche / Monat, Monats-Items nur Monat (dann ohne Umschalter). Standard ist Woche; Items jünger als 3 Wochen starten mit Tag. Die Wahl wird je Item und Abschnitt im Browser gemerkt.
- Die Y-Achse bleibt immer in der Einheit des Items: Tages-Items „pro Tag“ (bei Woche/Monat = Durchschnitt pro Tag), Wochen-Items „pro Woche“, Monats-Items „pro Monat“. So bleibt die Ziellinie vergleichbar. In der Auflösung des eigenen Zeitraums (Wochen-Item in Wochen, Monats-Item in Monaten) steht die einfache Summe.
- Darstellung: eine geglättete Verlaufslinie (zentrierter gleitender Durchschnitt über 7 Tage bzw. 3 Wochen bzw. 3 Monate) mit den Einzelwerten als dezente Punkte dahinter. Keine Balken. Am Rand wird über die vorhandenen Werte gemittelt.
- Der laufende, unvollständige Zeitraum wird über die bisher vergangenen Tage gemittelt und als vorläufig erkennbar gemacht (gestricheltes Linienstück, heller Punkt, Zusatz „(vorläufig)“ in den Details).
- Ziel als Hilfslinie, als Stufenlinie entlang des Zielverlaufs; Lücken, wo kein Ziel galt. Eine Legende nennt Trend, Ziel und den Hinweis zum Antippen.
- Antippen eines Punkts zeigt Zeitraum, Wert und das damals geltende Ziel; nochmaliges Antippen schließt die Auswahl.
- Achsen tragen nur ganze Zahlen (Schritte 1, 2, 5, 10 …, höchstens etwa 3 Intervalle) bzw. bei Uhrzeiten volle Stunden.
- Passen nicht alle Punkte mit sinnvollem Abstand (ca. 8 px) in die Breite, wird das Diagramm horizontal scrollbar und startet am rechten Ende (heute). Die Y-Achse scrollt nicht mit. Beschriftungen werden ausgedünnt, damit sie sich nicht überlappen.

**Pausen** (nur Tages-Items mit Pausenziel)

- Eine Pause ist die Zeit zwischen zwei aufeinanderfolgenden Einträgen mit Uhrzeit. Sie ist nur gültig, wenn an keinem Tag von ihrem Anfangs- bis zu ihrem Endtag ein Eintrag ohne Uhrzeit liegt; sonst ist sie unbekannt.
- Eine Pause gehört zu dem Tag, an dem sie endet. Die heute noch laufende Pause zählt für heute. Ein Tag ganz ohne Einträge, über den eine bekannte Pause hinwegläuft, bekommt die Pausenlänge bis Tagesende.
- Tageswert = längste Pause des Tages; Tage ohne gültige Pause sind unbekannt und werden nicht gewertet.
- Anzeige: Verlauf der Tageswerte in Stunden (gleiche Auflösungen und Darstellung wie der Trend, Pausenziel als Hilfslinie, Mittel der bekannten Tage) und die Kennzahl „Ziel erreicht an 5 von 7 Tagen“ für die letzten 7 abgeschlossenen Tage, mit Hinweis auf unbekannte Tage. Gezählt werden nur Tage, an denen überhaupt ein Pausenziel galt.

**Uhrzeiten** (nur bei mindestens 20 Einträgen mit Uhrzeit)

- **Tageszeit-Verteilung:** Anteil der Einträge je Stunde über den Tag (04:00 bis 03:59), umschaltbar letzte 4 Wochen / Gesamt.
- **Erster Eintrag des Tages** (nur Tages-Items): Uhrzeit des ersten Eintrags pro Tag als Verlauf plus „Ø 9:30 in den letzten 7 Tagen“. Tage, an denen ein Eintrag ohne Uhrzeit liegt, werden ausgelassen; gibt es in den letzten 7 Tagen keinen brauchbaren Tag, steht das dort.

**Leistung**

- Die Aggregation je Item wird zwischengespeichert und nur neu berechnet, wenn sich Daten, Ziele, Zeitraum oder der heutige Tag ändern.
- Die Übersicht wird nach dem Start im Hintergrund vorbereitet und danach nur geparkt (`content-visibility: hidden`), statt beim Wechsel neu aufzubauen. Änderungen aus der Track-Ansicht laufen verzögert in die Übersicht, damit das Tippen flüssig bleibt.

## Mehr (App-Menü)

Export, Import und „Alle Daten löschen“ als Liste, so angelegt, dass später weitere Einträge dazukommen können. Darüber steht, wie viele Items und Einträge auf dem Gerät liegen, samt Speicherstatus.

**Export**

- Speichert alle Daten im Format aus „Begriffe und Datenmodell“ als Datei `daily-tally-YYYY-MM-DD.json`.
- In eingebetteten Vorschauen werden Downloads und Zwischenablage oft still blockiert. Deshalb zusätzlich „Kopieren“; schlägt auch das fehl, wird der JSON-Text in einem markierbaren Feld angezeigt („Als Text anzeigen“), damit man ihn von Hand kopieren kann. Läuft die App in der claude.ai-Vorschau, geht der Download über deren Speichern-Dialog.

**Import**

- Zwei Wege im selben Sheet: **Datei wählen** oder den exportierten **Text einfügen** und prüfen lassen. Danach: prüfen → Nachfrage „Alle aktuellen Daten durch N Items und M Einträge ersetzen?“ mit erkanntem Format → ersetzen. Ungültige Datei bzw. ungültiger Text: Meldung mit Grund, nichts wird verändert.
- Nach dem Ersetzen springt die Auswahl auf heute und der Wochenstreifen auf die aktuelle Woche; ein Toast bestätigt.
- Akzeptiert das aktuelle Format (`version: 3`) und die beiden Formate des Prototyps, damit vorhandene Daten mitgenommen werden können:

| Format | Erkennung | Umwandlung |
| --- | --- | --- |
| aktuell (v3) | `version: 3` | geprüft und bereinigt: Namen auf 40 Zeichen, Zielverläufe nach `from` sortiert, Pausenziele nur bei Tages-Items |
| Prototyp v2 | `counts`-Objekt: `{ itemId: { "YYYY-MM-DD": Anzahl } }`; Items mit `goal`, `goalType`, `createdDay` | je Tag so viele Einträge ohne Uhrzeit wie gezählt; `goal`/`goalType` → ein Eintrag in `countGoals` ab Anlage; kein Pausenziel |
| Prototyp v1 | `events`-Liste: `{ id, itemId, ts }`; Items mit `createdAt` (Zeitstempel) | je Event ein Eintrag mit `ts`; `day` aus `ts` mit 4-Uhr-Grenze; `createdDay` aus `createdAt`, sonst erster Eintrag |

Der Zeitraum eines Prototyp-Items wird aus `period`/`type`/`frequency` erraten (Woche, Monat, sonst Tag), der Zieltyp aus `goalType` (`min`/`at least`/`>=` → mindestens, sonst höchstens).

**Alle Daten löschen**

- Zweistufige Bestätigung mit deutlichem Warntext und dem Angebot „Erst exportieren“, danach leerer Ausgangszustand und ein Toast.

## Technische Anforderungen und Stolperfallen

Die App ist eine statisch hostbare React-Single-Page-App (React 19 + Vite), mobil zuerst, die offline startet; die Stolperfallen unten sind im Prototyp tatsächlich aufgetreten und müssen vermieden bleiben.

**Rahmen**

- Eine Seite, mobil zuerst (Referenzbreite 390 px), am Desktop benutzbar.
- Installierbare Web-App (PWA): Manifest und Service Worker, Start ohne Netz nach dem ersten Aufruf. Statisches Hosting über HTTPS (z. B. GitHub Pages).
- Speicher: `localStorage`, Schlüssel `daily-tally-v3` (Anzeige-Einstellungen `daily-tally-ui`). Jeder Zugriff in `try/catch`. Ist der Speicher nicht verfügbar oder voll, erscheint ein sichtbarer Hinweis oben und die App bleibt bis zum Neuladen nutzbar. Beim Start dauerhaften Speicher anfordern (`navigator.storage.persist()`).
- Unlesbare oder ungültige gespeicherte Daten werden nicht stillschweigend überschrieben, sondern unter `daily-tally-v3-defekt-<Zeitstempel>` zur Seite gelegt; die App startet leer.
- Alle visuellen Werte (Farben, Schriften, Abstände, Radien, Animationsdauern, Diagrammmaße) als zentrale Variablen, damit das Design austauschbar bleibt. Oberflächentexte zentral in `src/strings.js`.

**Stolperfallen aus dem Prototyp**

1. **Kein `<form>` mit Submit.** In eingebetteten Vorschauen (sandboxed iframe ohne `allow-forms`) wird das Absenden still blockiert – „Speichern“ tat nichts. Speichern direkt per Klick und per Enter-Taste auslösen.
2. **Download und Zwischenablage** sind dort ebenfalls still blockiert → Fallbacks wie im App-Menü beschrieben.
3. **Datumsrechnung** über Tagesnummern statt lokaler `Date`-Arithmetik; Wochenstart Montag; 4-Uhr-Grenze an einer Stelle definiert.
4. **Datumsformatierer** (`Intl.DateTimeFormat`) nicht pro Aufruf neu anlegen – das war der Hauptgrund für eine träge Übersicht. Die App formatiert Datum und Uhrzeit selbst aus Tagesnummern.
5. **Leistung der Übersicht:** Aggregationen pro Item zwischenspeichern, im Hintergrund vorbereiten und nur parken statt neu aufbauen. Ziel: Wechsel in die Übersicht unter 100 ms mit 2 Jahren Daten und 5 Items.
6. **Wochenstreifen:** CSS Scroll-Snap pro Woche mit `scroll-snap-stop: always` (ohne das überspringen kräftige Wische mehrere Wochen). Nur Wochen nahe der sichtbaren rendern. Bei Größenänderung neu ausrichten. Harte Sprünge brauchen ein **frisches Scroll-Element** (neuer `key`, Position vor dem Zeichnen setzen) – setzt man nur `scrollLeft`, rastet Chrome später zur alten Woche zurück.
7. **Sheet ziehen:** Pointer Events mit Pointer Capture, Position direkt am Element setzen (nicht über React-State), `touch-action: none` am Griff.
8. **Horizontal scrollbare Bereiche** starten am rechten Ende – über `direction: rtl` am Scrollbereich, damit das auch gilt, wenn er unsichtbar erzeugt wurde (z. B. in der geparkten Übersicht).
9. **Laufende Werte:** Pausen-Zähler per Intervall aktualisieren; Tageswechsel (04:00) alle 30 s und beim Zurückkehren in den Vordergrund prüfen.
10. **Keine blockierenden Touch-/Wheel-Listener** – sonst stockt das Scrollen. Das Umsortieren sperrt das Scrollen erst nach dem Anheben und verfolgt den Finger danach über Touch-Events (die laufen weiter, auch wenn der Browser die Zeiger-Geste abbricht).

**Testen**

- Rechenlogik in Node (`npm test`, `TZ=Europe/Berlin`): Tagesgrenze, Zeiträume, Ziele, Pausen, Import.
- Browser-Abnahmetests (Python + Playwright, ~150 Prüfungen, siehe README): Handy-Breite 390 px, echte Touch-Gesten über das Chrome DevTools Protocol, sandboxed iframes (einmal `allow-scripts allow-same-origin`, einmal nur `allow-scripts` – dort wirft `localStorage`), Offline-Start, Hell- und Dunkelmodus, Leistungsmessung mit gedrosselter CPU.
- Synthetische Scroll-Gesten lösen im Headless-Browser keine Touch-Bewegung aus und täuschen Fehler vor – immer echte Touch-Ereignisse schicken.
- Nach Änderungen an Gesten, Wochenstreifen, Sheets oder Diagrammen laufen die Browsertests.

## Abnahmekriterien

Erfüllt in Handy-Breite und im sandboxed iframe, ohne Fehler in der Konsole. `[x]` = durch die Browsertests abgedeckt.

**Items und Ziele**

- [x] Item anlegen per Knopf und per Enter funktioniert auch im sandboxed iframe.
- [x] Speichern ist gesperrt, solange der Name leer ist; Abbrechen, Hintergrund, Escape und Herunterziehen schließen ohne Änderung.
- [x] Beim Anlegen liegt das Namensfeld im oberen Bildschirmdrittel und hat nach dem Einfahren den Fokus.
- [x] Kurzer Zug am Griff federt zurück; langer Zug oder schneller Wisch schließt; während des Ziehens folgt das Sheet dem Finger pixelgenau.
- [x] „Höchstens 10“ mit Wert 10 gilt als im Rahmen; Wert 11 als „1 überschritten“. „Mindestens 3“ mit Wert 5 gilt als erreicht mit „+2“.
- [x] Ziel am 1. Nov von 10 auf 8 geändert („Ab jetzt“): Tage im Oktober werden weiter gegen 10 bewertet, ab 1. Nov gegen 8; die Hilfslinie im Trend macht eine Stufe.
- [x] „Korrektur für den ganzen Verlauf“ ersetzt den Zielverlauf durch einen Eintrag ab Beginn des Items.
- [x] Zeitraum eines bestehenden Items ist nicht änderbar.
- [x] Nur den Namen ändern fragt nicht nach „Ab jetzt / Korrektur“.
- [x] Pausenziel wird nur bei Tages-Items angeboten.

**Track-Ansicht**

- [x] Plus heute speichert einen Eintrag mit Uhrzeit; Plus an einem vergangenen Tag einen ohne Uhrzeit (`ts: null`).
- [x] Minus entfernt den zuletzt angelegten Eintrag des Tages; bei Wochen-/Monats-Items an einem leeren Tag den zuletzt angelegten des Zeitraums; bei 0 deaktiviert.
- [x] Ein Wisch blättert genau eine Woche; ein harter Wisch ebenfalls nur eine; ein kleiner langsamer Zug federt zurück; der Streifen steht nie zwischen zwei Wochen.
- [x] Tag antippen zeigt dessen Werte und bewegt den Streifen nicht; künftige Tage sind nicht wählbar.
- [x] Heute-Knopf wählt heute und springt zur aktuellen Woche, mit genau einem Wochenschritt als Animation; nach Ansichtswechsel steht der Streifen auf der Woche des gewählten Tags und bleibt dort (kein Zurückrasten).
- [x] Kopfzeile zeigt „Sept – Okt 2026“ für die Woche 28. Sept bis 4. Okt; ein Tipp darauf öffnet den Datumswähler, die Auswahl springt auf den gewählten Tag.
- [x] Ein Eintrag um 01:30 zählt zum Vortag.
- [x] Uhrzeit eines Eintrags lässt sich über die Zeitauswahl setzen und ändern, aber nicht in die Zukunft oder außerhalb des Tagesfensters; eine leere Uhrzeit macht ihn wieder „ohne Uhrzeit“.
- [x] Ein gelöschter Eintrag lässt sich über „Rückgängig“ wiederherstellen.
- [x] Monats-Item: Wert ist die Summe des Kalendermonats, Bezug „diesen Monat“ bzw. „Oktober 2026“.
- [x] Langes Drücken hebt ein Item an, Ziehen sortiert um, kurzes Tippen öffnet weiter das Bearbeiten-Sheet; Drücken auf den Zählknöpfen hebt nichts an; die neue Reihenfolge gilt auch im Verlauf und bleibt nach dem Neuladen.
- [x] Normales Scrollen der Liste bleibt flüssig und löst kein Umsortieren aus.

**Pausen**

- [x] Letzter Eintrag gestern 23:00, jetzt 10:00: Pausen-Zähler zeigt „seit 11 h“; bei Ziel 12 h noch offen, um 11:00 erreicht.
- [x] Plus beendet die Pause und zeigt kurz ihre Dauer.
- [x] Liegt zwischen zwei Einträgen mit Uhrzeit ein Tag mit einem Eintrag ohne Uhrzeit, gilt die Pause als unbekannt und zählt weder als erreicht noch als verfehlt.
- [x] Die Pause 23:00 → 10:00 zählt für den Tag, an dem sie endet.

**Verlauf**

- [x] Trend reicht bis zum Beginn des Items, ohne Balken; Auflösung umschaltbar und gemerkt; Y-Achse bleibt „pro Tag“, „pro Woche“ bzw. „pro Monat“; Monats-Items zeigen keinen Umschalter.
- [x] Ein Jahr Tagesdaten in Auflösung Tag ist horizontal scrollbar, startet bei heute, Y-Achse bleibt stehen.
- [x] Achsen zeigen nur ganze Zahlen bzw. volle Stunden; der laufende Zeitraum ist als vorläufig erkennbar.
- [x] Pausen-Auswertung erscheint nur bei Tages-Items mit Pausenziel; Uhrzeiten-Auswertungen nur ab 20 Einträgen mit Uhrzeit.
- [x] Wechsel in die Übersicht dauert unter 100 ms mit 2 Jahren Daten und 5 Items (mit gedrosselter CPU gemessen).

**Mehr und Daten**

- [x] Export, dann „Alle Daten löschen“, dann Import stellt exakt den alten Zustand her.
- [x] Ein Export aus dem Prototyp (v2, und v1) lässt sich importieren; Werte pro Tag stimmen.
- [x] Import per eingefügtem Text funktioniert wie der Import per Datei.
- [x] Eine ungültige Datei bzw. ein ungültiger Text ändert nichts und zeigt eine Meldung mit Grund.
- [x] Ohne verfügbaren Speicher (iframe nur mit `allow-scripts`) läuft die App und zeigt einen Hinweis.
- [x] Nach erstem Aufruf startet die App ohne Netz.

## Nicht enthalten und offen

Bewusst nicht Teil der App, damit sie einfach bleibt:

- Erinnerungen und Benachrichtigungen (bei Web-Apps auf dem Handy unzuverlässig)
- Konten, Server, Synchronisation zwischen Geräten
- Heatmap, Monatsübersicht und Statistik-Kacheln aus dem Prototyp
- Serien, Abzeichen oder andere Spielelemente
- Mehrere Ziele gleichzeitig für ein Item (z. B. Tages- **und** Wochenziel); Notizen zu Einträgen; Werte größer als 1 pro Tipp

Entschieden (war offen):

- Sprache der Oberfläche: Deutsch, du-Form.
- Hell- und Dunkelmodus: beide, nach Systemeinstellung (siehe `claude/Design.md`).
- Weit zurückblättern: Kalender über die Kopfzeile des Wochenstreifens.
- Zeiträume: zusätzlich zu Tag und Woche auch Monat.
- Items umsortieren: per langem Drücken und Ziehen.

Noch offen für später:

- Menü-Einstellungen: Uhrzeit des Tageswechsels, erster Wochentag.
- Mehrere Geräte bzw. Sicherung ohne Datei-Hantieren.
