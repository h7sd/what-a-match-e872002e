# 🚀 Migration von Lovable Cloud zu deiner Supabase

## Der einfachste Weg (empfohlen)

### Schritt 1: Schema exportieren

1. Geh in dein Lovable Cloud Dashboard (klick auf "View Backend" im Editor)
2. Öffne den **SQL Editor**
3. Führe dieses Query aus um das komplette Schema zu exportieren:

```sql
-- Zeigt alle Tabellen im public Schema
SELECT 
  'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (...);' as statement
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Schritt 2: pg_dump verwenden (Bester Weg!)

Falls du Zugriff auf die Supabase CLI oder psql hast:

```bash
# Von Lovable Cloud exportieren (connection string aus Dashboard)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  > export.sql

# In deine Supabase importieren
psql "postgresql://postgres:[PASSWORD]@db.[DEIN-PROJEKT].supabase.co:5432/postgres" \
  < export.sql
```

### Schritt 3: Edge Functions

Die Edge Functions sind im Code unter `supabase/functions/`. 
Wenn du das Projekt auf GitHub exportierst und mit deiner Supabase verbindest, 
werden sie automatisch deployed.

## ⚠️ Was du beachten musst

### 1. Benutzer (auth.users)
- Benutzer-Accounts sind in `auth.users` gespeichert
- Diese können **NICHT** einfach kopiert werden (Passwort-Hashes sind verschlüsselt)
- **Option A**: Benutzer müssen sich neu registrieren
- **Option B**: Nutze die Supabase Auth Migration Tools

### 2. Storage (Dateien)
Die Dateien in diesen Buckets musst du manuell kopieren:
- `avatars` - Profilbilder
- `backgrounds` - Hintergrundbilder  
- `badge-icons` - Badge Icons
- `audio` - Musik-Dateien

### 3. Foreign Keys zu auth.users
Einige Tabellen referenzieren `auth.users(id)`:
- `profiles.user_id`
- `discord_integrations.user_id`
- `spotify_integrations.user_id`

Diese Referenzen müssen bestehen bleiben oder angepasst werden.

## 📁 Die Migration-Files in diesem Ordner

Wenn du das Schema manuell aufbauen willst, nutze die Migrations aus:
`supabase/migrations/` (sortiert nach Datum)

Die erste Migration `20260124005504_*.sql` enthält das Basis-Schema.
Alle weiteren Migrations fügen Features hinzu.

## 🔧 Dein externes Supabase einrichten

Nach der Migration, ändere in `.env`:

```env
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=dein-anon-key
VITE_SUPABASE_PROJECT_ID=dein-projekt-id
```

## 💡 Alternative: Projekt auf GitHub exportieren

1. In Lovable: Settings → GitHub → Export to GitHub
2. Supabase CLI installieren
3. `supabase link` mit deinem Projekt
4. `supabase db push` um Schema zu synchronisieren
5. Daten manuell importieren
