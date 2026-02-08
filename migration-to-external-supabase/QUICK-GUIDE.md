# 🚀 Schnellste Migration zu deiner Supabase

## Option A: Über das Admin Panel (EMPFOHLEN)

1. **Öffne dein Dashboard** und geh zu `/secret-database` 
2. **Klick auf "Export Full Backup"** Button im Header
3. **Speichere die SQL-Datei** die generiert wird
4. **Geh in deine externe Supabase** → SQL Editor
5. **Führe die SQL-Datei aus**

## Option B: GitHub + Supabase CLI (Für Schema)

### Schritt 1: Projekt auf GitHub exportieren
1. In Lovable: **Settings → GitHub → Export to GitHub**
2. Repo wird erstellt mit allem Code

### Schritt 2: Supabase CLI installieren
```bash
npm install -g supabase
```

### Schritt 3: Schema in deine Supabase pushen
```bash
# Klone dein Repo
git clone https://github.com/DEIN-USER/DEIN-REPO.git
cd DEIN-REPO

# Migrations direkt in deine Supabase pushen
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[DEIN-PROJEKT].supabase.co:5432/postgres"
```

**WICHTIG:** Nutze die direkte DB-URL (db.xxx.supabase.co), NICHT die Pooler-URL!

### Schritt 4: Daten importieren
Die Daten musst du separat über den Admin Export oder manuell importieren.

## ⚠️ Was du manuell machen musst

### Storage Buckets erstellen
In deiner Supabase → Storage → New Bucket:
- `avatars` (public: true)
- `backgrounds` (public: true)
- `badge-icons` (public: true)
- `audio` (public: true)
- `profile-assets` (public: true)

### Edge Functions deployen
```bash
cd supabase/functions
supabase functions deploy --project-ref DEIN-PROJEKT-ID
```

### Secrets konfigurieren
In Supabase Dashboard → Edge Functions → Secrets:
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `ENCRYPTION_SECRET` (nutze: `uservault-default-secret-change-in-prod` für bestehende Daten)

### .env anpassen
```env
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=dein-anon-key
VITE_SUPABASE_PROJECT_ID=dein-projekt-id
```

## 🔑 Auth Users Migration

Die `auth.users` werden beim Admin Export mitexportiert (inklusive Passwort-Hashes).
Diese müssen in der neuen Supabase unter SQL Editor eingefügt werden.

**Voraussetzung:** Die RPC-Funktion `export_auth_users_for_migration` existiert bereits.

---

## Zusammenfassung

| Was | Wie |
|-----|-----|
| Schema | GitHub Export → `supabase db push` |
| Daten | Admin Panel → Export Full Backup → SQL Editor |
| Auth Users | Im Export enthalten |
| Storage Dateien | Manuell hochladen |
| Edge Functions | `supabase functions deploy` |
| Secrets | Supabase Dashboard |
