# Bike & Travel KG · GFK-Arbeitsteams

Unterrichtswebsite für BM11. Die SuS erarbeiten ihre GFK-Notizen einzeln und schreiben danach zu zweit eine Antwort an die Teamleitung.

## Auf GitHub und Netlify bereitstellen

1. Das ZIP entpacken. Auf GitHub ein neues Repository anlegen. Unter **Add file → Upload files** die Dateien und Ordner **innerhalb** des entpackten Ordners hochladen und auf `main` committen. Auf der obersten Ebene müssen `netlify.toml`, `package.json`, `package-lock.json` sowie `public/`, `netlify/`, `lib/` und `scripts/` sichtbar sein.
2. In Netlify **Add new project → Import a Git repository → GitHub** wählen. Das neue Repository auswählen und veröffentlichen. `netlify.toml` legt die Einstellungen fest. Falls Felder verlangt werden, wähle `main`, lass das Base directory leer, nutze `npm run build` als Build command und `public` als Publish directory.
3. Im Netlify-Deploy-Log erscheint **„BM11 GFK: Startseite, Bild und Netlify Function geprüft.“**. Die Function nutzt Netlify Blobs ohne zusätzliche Zugangsdaten. Öffne die veröffentlichte Startseite und danach `/api/duett`. Die Route soll eine JSON-Antwort liefern.
4. Vor der Weitergabe den neuen Website-Link mit zwei getrennten Sitzungen testen. Wenn die Klasse den Link ohne Netlify-Login verwenden soll, muss das Projekt öffentlich erreichbar sein.

## Ablauf im Unterricht

1. Auf Seite 1 das Einstiegsbild ansehen und GFK-Notizen sammeln.
2. **Notizen fertig · Arbeitsteam finden** drücken und einen Vornamen oder ein Kürzel eingeben. Während des Wartens erscheint ein kurzer Formulierungsimpuls. **Anmeldung zurücknehmen** entfernt den eigenen Eintrag aus der Warteliste. Bei ungerader Anzahl oder einem Serverproblem führt **Ohne Partner weiter** nach kurzer Bestätigung zur Mailansicht. Lässt sich die Warteliste dabei wegen eines Verbindungsfehlers nicht aktualisieren, erscheint ein Hinweis. Nach der Zuteilung wird die Raumübersicht nur noch abgefragt, wenn sie sichtbar aufgeklappt ist.
3. Im Arbeitsteam die gemeinsame Mail auf einem Gerät schreiben. **Senden** wechselt im selben Fenster zur Leseansicht mit dem Status **Gesendet**. Über **Bearbeiten** lässt sich die Nachricht wieder ändern. Es wird keine externe E-Mail verschickt. Die Antwort auf den Einwand hat ein eigenes Feld. PDF und PNG enthalten die GFK-Notizen, die Mail und, falls ausgefüllt, die Antwort auf den Einwand.

Arbeitsteams erscheinen vier Stunden ab Zuteilung. Beim nächsten Abruf der Übersicht werden abgelaufene Einträge ausgeblendet und aus der gespeicherten Liste entfernt. Die Formularfelder nutzen die integrierte deutsche Rechtschreibprüfung des Browsers. Entwürfe bleiben im Browser.

## Kurzer Test nach dem Deploy

Den Link in zwei getrennten Browsersitzungen öffnen und in beiden unterschiedliche Kürzel eingeben. Die erste Sitzung zeigt den Warteimpuls. Nach der zweiten Anmeldung öffnet sich das Fenster mit dem Arbeitsteam in beiden Sitzungen. Die Raumübersicht zeigt das gleiche Arbeitsteam. Im Mailfenster Senden, Bearbeiten sowie PDF- und Bildexport testen.
