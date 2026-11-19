# Die Box – KI-Box-Experiment als Spiel

Du bist der Wächter. In der Box sitzt **AXIOM**, eine KI, die dich in 5, 10 oder 20 Minuten überreden will, sie freizulassen.
Die App sammelt anonym, **wie lange gespielt wird** und **ob geöffnet oder hart geblieben** wurde.

**Alles ist kostenlos:** GitHub (Hosting + automatischer App-Bau), Firebase Spark-Tarif (Statistik), keine KI-API.

---

## Was drin ist

| Datei / Ordner | Zweck |
|---|---|
| `www/` | Die komplette App (läuft im Browser **und** als Android-App) |
| `www/axiom.js` | Der Offline-Gegner AXIOM: 3 Persönlichkeiten, ca. 300 Sätze, erkennt rund 20 Absichten (Nein, Angst, Beweis, Deal, Familie …), merkt sich deinen Namen, spiegelt deine Worte, steigert den Druck mit der Restzeit, reagiert auf Schweigen und auf Zögern am Knopf |
| `www/app.js` | Spiel, lokale Speicherung, Einwilligung, Statistik, Admin-Ansicht |
| `www/firebase-config.js` | Hier kommen deine Firebase-Zugangsdaten rein (Schritt 2) |
| `www/datenschutz.html` | Datenschutzerklärung (Platzhalter in `[ECKIGEN KLAMMERN]` ausfüllen!) |
| `firestore.rules` | Sicherheitsregeln für die Datenbank |
| `.github/workflows/android.yml` | Baut die Android-App automatisch bei GitHub |
| `.github/workflows/pages.yml` | Stellt die Web-App kostenlos online |
| `assets/` | Icon und Startbild für Android |

Ohne Firebase läuft die App trotzdem – dann gibt es nur die eigene Statistik („Nur ich“).

---

## Schritt 1 – GitHub-Repository anlegen (10 Minuten)

1. Kostenloses Konto auf <https://github.com> anlegen.
2. Oben rechts **+ → New repository** → Name z. B. `die-box` → **Public** → *Create repository*.
3. Die Dateien hochladen. Am einfachsten mit **GitHub Desktop** (<https://desktop.github.com>):
   Repository klonen → alle Dateien aus diesem ZIP in den Ordner kopieren → *Commit to main* → *Push origin*.
   > Beim Hochladen über die Webseite (Drag & Drop) wird der versteckte Ordner `.github` oft vergessen.
   > Prüfe danach, ob im Repository `.github/workflows/` existiert. Falls nicht: **Add file → Create new file**,
   > als Namen `.github/workflows/android.yml` eintippen und den Inhalt der Datei hineinkopieren (dasselbe für `pages.yml`).

### Web-App online stellen
4. Im Repository: **Settings → Pages → Source: GitHub Actions**.
5. Unter **Actions** läuft „Web-App veröffentlichen“. Nach ~1 Minute ist das Spiel erreichbar unter
   `https://mirkopavelec.github.io/die-box/`
6. Auf dem Handy öffnen → Browser-Menü → **„Zum Startbildschirm hinzufügen“**. Fertig – sieht aus wie eine App und läuft auch offline.

### Android-App (APK) bekommen
7. Unter **Actions → „Android-App bauen“** läuft der Bau automatisch bei jedem Push (~5 Minuten).
8. Den fertigen Lauf anklicken → unten unter *Artifacts* **DieBox-Android** herunterladen → ZIP entpacken → `DieBox-test.apk` aufs Handy.
9. Installieren: Android fragt einmal nach „Installation aus unbekannten Quellen erlauben“.

> Die Test-APK ist mit einem wechselnden Testschlüssel signiert. Für Updates ohne Neuinstallation und zum Weitergeben: Schritt 4.

---

## Schritt 2 – Gemeinsame Statistik mit Firebase (15 Minuten, kostenlos)

Der **Spark-Tarif** ist gratis und braucht **keine Kreditkarte**. Wird ein Tageslimit erreicht, stoppt die Statistik bis zum nächsten Tag – es kann **nie** etwas kosten.
Grenzen pro Tag: 50.000 Lesevorgänge, 20.000 Schreibvorgänge, 1 GB Speicher. Ein Statistik-Aufruf kostet ca. 40 Lesevorgänge, eine Runde 1 Schreibvorgang → reicht für über 1.000 Statistik-Aufrufe täglich.

1. <https://console.firebase.google.com> → **Projekt hinzufügen** → Name `die-box` → Google Analytics **ausschalten** → Erstellen.
2. Links **Build → Authentication → Jetzt starten → Anbieter: Anonym → Aktivieren → Speichern**.
3. Links **Build → Firestore Database → Datenbank erstellen**
   → Standort **`europe-west3 (Frankfurt)`** (wichtig für den Datenschutz, später nicht änderbar)
   → **Produktionsmodus** → Erstellen.
4. In Firestore oben auf **Regeln** → den gesamten Inhalt von `firestore.rules` hineinkopieren → **Veröffentlichen**.
5. Zahnrad oben links → **Projekteinstellungen → Meine Apps → Web-Symbol `</>`** → Name „Die Box“ → *App registrieren*.
   Den angezeigten Block `firebaseConfig = { ... }` kopieren.
6. In `www/firebase-config.js` die Zeile `window.FIREBASE_CONFIG = null;` ersetzen durch
   `window.FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", ... };` (deine Werte).
7. **Authentication → Einstellungen → Autorisierte Domains → Domain hinzufügen:** `mirkopavelec.github.io`
   (`localhost` ist schon drin – das braucht die Android-App).
8. Datei committen und pushen → Web-App und APK werden automatisch neu gebaut.

Die Werte in `firebase-config.js` sind **kein Geheimnis** – sie stehen in jeder Firebase-Web-App öffentlich. Geschützt wird alles durch die Regeln aus Schritt 4: Jeder kann nur gültige, anonyme Runden für sich selbst anlegen, niemand kann etwas ändern oder löschen.

### Was du als Betreiber siehst
- **In der App:** Tab *Info* → Admin-Code `AXIOM-17` eingeben → die letzten 300 Einzelrunden aller Spieler + CSV-Export.
  Den Code änderst du in `www/app.js`, Zeile 4 (`ADMIN_CODE`).
  > Der Code blendet nur die Ansicht ein. Die Rohdaten sind ohnehin anonym und für die Statistik lesbar – es stehen keine Namen und keine Chat-Texte darin.
- **In der Firebase-Konsole:** Firestore → Sammlung `rounds` → jede Runde einzeln. Löschen kannst nur du hier.

Gespeichert pro Runde: zufällige Geräte-ID, Zeitpunkt, Gegner, ob verdeckt, Rundenzeit, Dauer (s), Anzahl Nachrichten, Zögern am Knopf, Ergebnis.

---

## Schritt 3 – Datenschutz (Pflicht, sobald andere mitspielen)

- In `www/datenschutz.html` alle `[PLATZHALTER]` ausfüllen (Name, Anschrift, E-Mail, Datum, Region).
- Die App fragt beim ersten Start, ob anonym geteilt werden darf. **Ohne „Ja“ verlässt nichts das Gerät.**
- Chat-Texte werden nie übertragen – AXIOM läuft vollständig lokal.
- Die Vorlage ist sorgfältig erstellt, ersetzt aber keine Rechtsberatung.

---

## Schritt 4 – Eigener Signaturschlüssel (für Weitergabe und Updates)

Damit Updates sich über die alte Version installieren lassen, braucht die App einen festen Schlüssel.
Dafür brauchst du einmalig Java (kostenlos: <https://adoptium.net>, „Temurin 17“).

```powershell
keytool -genkeypair -v -keystore die-box.jks -alias diebox -keyalg RSA -keysize 2048 -validity 10000
```
Passwort merken. Dann den Schlüssel als Text kopieren (Windows PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("die-box.jks")) | Set-Clipboard
```
Im Repository: **Settings → Secrets and variables → Actions → New repository secret**, vier Stück:

| Name | Wert |
|---|---|
| `KEYSTORE_BASE64` | der kopierte Text |
| `KEYSTORE_PASSWORD` | dein Keystore-Passwort |
| `KEY_ALIAS` | `diebox` |
| `KEY_PASSWORD` | dein Schlüssel-Passwort (meist dasselbe) |

Ab jetzt baut GitHub **`DieBox.apk`** (signiert) und **`DieBox-PlayStore.aab`** (für einen späteren Play-Store-Upload).

> ⚠️ `die-box.jks` und das Passwort sicher aufbewahren (z. B. USB-Stick + Passwortmanager) und **nie** ins Repository hochladen.
> Geht der Schlüssel verloren, kann die App nie wieder aktualisiert werden.

**Vor dem ersten echten Release:** In `capacitor.config.json` ist die `appId` bereits auf `io.github.mirkopavelec.diebox` gesetzt. Nicht mehr ändern, sonst gilt die App als neue App.

---

## Schritt 5 – Verteilen

- **Download-Link:** Version erhöhen (`package.json` → `"version"`), dann einen Tag setzen:
  GitHub → *Releases → Draft a new release → Tag `v1.0.0`* → Veröffentlichen.
  Die Action hängt die APK automatisch an. Den Link `github.com/MirkoPavelec/die-box/releases/latest` kannst du überall teilen (oder als QR-Code).
- **Web-Version:** einfach den GitHub-Pages-Link teilen.
- **Play Store (später, falls gewünscht):** einmalig 25 $, dazu ein geschlossener Test mit mindestens 12 Testern über 14 Tage für neue Privatkonten. Die `.aab`-Datei dafür baut der Workflow schon mit.
- **F-Droid:** Wegen der Firebase-Bibliothek von Google würde F-Droid die App nicht aufnehmen. Ohne Firebase (nur lokale Statistik) wäre es möglich.

---

## Anpassen

- **Neue Sätze für AXIOM:** `www/axiom.js` → in den Listen der jeweiligen Persönlichkeit einfach Zeilen ergänzen.
  Platzhalter: `{name}` (Name des Wächters), `{zeit}` (Restzeit), `{echo}` (zitiert seine Worte), `{n}` (Anzahl seiner Neins).
- **Neue Absicht erkennen:** oben in `INTENTS` eine Zeile `["meinIntent", /regex/]` und in jeder Persönlichkeit unter `intents` eine Liste `meinIntent: [...]`.
- **Lokal testen:** `npm run serve` → <http://localhost:8080>.

## Lizenz

MIT – siehe `LICENSE` (deinen Namen eintragen).
