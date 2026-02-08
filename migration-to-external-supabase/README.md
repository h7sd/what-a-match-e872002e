# Migration zu externer Supabase

## ⚠️ WICHTIG: Vor der Migration lesen!

Diese Migration kopiert **NUR** das `public` Schema. Die folgenden Dinge werden **NICHT** automatisch migriert:
- `auth.users` (Benutzer-Accounts) - müssen separat über Supabase Auth exportiert werden
- Storage Buckets und Dateien
- Edge Functions (die sind im Code und werden automatisch deployed)

## Schritt 1: Schema erstellen

Führe `01-schema.sql` in deiner Supabase unter **SQL Editor** aus. Dies erstellt:
- Alle Tabellen
- Alle Funktionen
- Alle Trigger
- Alle RLS Policies

## Schritt 2: Daten importieren

Führe `02-data-global-badges.sql` aus (Badges zuerst, da andere Tabellen darauf referenzieren).
Dann `03-data-profiles.sql` für Profile.
Dann `04-data-user-badges.sql` für Badge-Zuweisungen.
Dann `05-data-other.sql` für restliche Daten.

## Schritt 3: Auth Users migrieren (OPTIONAL)

Wenn du die bestehenden Benutzer-Accounts übernehmen willst:
1. Geh in Lovable Cloud Dashboard → Auth
2. Exportiere die Benutzer
3. Importiere sie in deine externe Supabase

**ODER** lass Benutzer sich neu registrieren.

## Schritt 4: Storage Buckets erstellen

Erstelle diese Buckets in deiner Supabase:
- `avatars` (public)
- `backgrounds` (public)
- `badge-icons` (public)
- `audio` (public)

## Schritt 5: .env anpassen

Ändere in deinem Projekt:
```
VITE_SUPABASE_URL=https://DEINE-PROJEKT-ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=dein-anon-key
```

## Hinweise

- Die Migration kann einige Minuten dauern bei großen Datenmengen
- Teste zuerst in einer leeren Supabase-Instanz
- Mache ein Backup deiner Ziel-Datenbank bevor du startest
