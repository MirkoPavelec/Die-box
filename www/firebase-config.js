/* Firebase-Konfiguration für die gemeinsame Statistik.
 *
 * Solange hier null steht, läuft die App komplett lokal (eigene Statistik
 * funktioniert, "Alle Spieler" zeigt einen Hinweis).
 *
 * So bekommst du die Werte (kostenlos, ohne Kreditkarte):
 *  Firebase-Konsole → Projekt → Projekteinstellungen → "Meine Apps" → Web-App (</>)
 *  → das angezeigte firebaseConfig-Objekt hier einfügen.
 *
 * Diese Werte sind KEIN Geheimnis – sie stehen in jeder Firebase-Web-App
 * öffentlich. Geschützt wird die Datenbank durch firestore.rules.
 */
window.FIREBASE_CONFIG = null;

/* Beispiel:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "die-box-12345.firebaseapp.com",
  projectId: "die-box-12345",
  storageBucket: "die-box-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
*/
