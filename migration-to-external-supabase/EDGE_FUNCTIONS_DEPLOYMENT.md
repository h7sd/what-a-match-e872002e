# Edge Functions Deployment Guide

Diese Anleitung erklärt, wie du alle Edge Functions von deinem Lovable-Projekt auf deine externe Supabase-Instanz (`nuszlhxbyxdjlaubuwzd`) deployst.

---

## Voraussetzungen

1. **Node.js** (v18+) installiert
2. **Supabase CLI** installiert
3. Zugang zum externen Supabase-Dashboard

---

## Schritt 1: Supabase CLI installieren

### Windows (PowerShell als Admin)
```powershell
npm install -g supabase
```

### Mac/Linux
```bash
npm install -g supabase
```

### Überprüfen
```bash
supabase --version
```

---

## Schritt 2: Bei Supabase einloggen

```bash
supabase login
```

Dies öffnet deinen Browser – logge dich mit deinem Supabase-Account ein.

---

## Schritt 3: Projektordner vorbereiten

Erstelle einen **neuen leeren Ordner** auf deinem PC (nicht im Lovable-Projekt!):

```bash
mkdir uservault-external
cd uservault-external
```

Initialisiere Supabase:
```bash
supabase init
```

---

## Schritt 4: Edge Functions kopieren

Kopiere den gesamten `supabase/functions/` Ordner aus deinem Lovable-Projekt in den neuen Ordner.

Die Struktur sollte so aussehen:
```
uservault-external/
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── admin-delete-account/
│       │   └── index.ts
│       ├── admin-remove-mfa/
│       │   └── index.ts
│       ├── alias-request/
│       │   └── index.ts
│       ... (alle anderen Functions)
```

---

## Schritt 5: Mit externem Projekt verknüpfen

```bash
supabase link --project-ref nuszlhxbyxdjlaubuwzd
```

Du wirst nach dem **Database Password** gefragt – das findest du im Supabase Dashboard unter:
**Project Settings → Database → Database password**

---

## Schritt 6: Secrets konfigurieren

Bevor du deployst, müssen alle Secrets gesetzt werden. Führe diese Befehle aus:

### Pflicht-Secrets

```bash
# Discord Bot
supabase secrets set DISCORD_BOT_TOKEN="dein-discord-bot-token"
supabase secrets set DISCORD_CLIENT_ID="deine-discord-client-id"
supabase secrets set DISCORD_CLIENT_SECRET="dein-discord-client-secret"

# Discord Webhooks
supabase secrets set DISCORD_WEBHOOK_SECRET="dein-webhook-secret"
supabase secrets set PUBLISH_WEBHOOK="https://discord.com/api/webhooks/..."
supabase secrets set BAN_APPEAL="https://discord.com/api/webhooks/..."
supabase secrets set REPORT_WEBHOOK="https://discord.com/api/webhooks/..."

# Email (Resend)
supabase secrets set RESEND_API_KEY="re_..."

# PayPal
supabase secrets set PAYPAL_CLIENT_ID="deine-paypal-client-id"
supabase secrets set PAYPAL_CLIENT_SECRET="dein-paypal-client-secret"

# Sicherheit
supabase secrets set ENCRYPTION_SECRET="uservault-default-secret-change-in-prod"
supabase secrets set CLEANUP_SECRET="dein-cleanup-secret"

# Cloudflare Turnstile
supabase secrets set CLOUDFLARE_TURNSTILE_SECRET_KEY="dein-turnstile-secret"

# Lovable (optional, falls verwendet)
supabase secrets set LOVABLE_API_KEY="dein-lovable-api-key"
```

### Secrets überprüfen
```bash
supabase secrets list
```

---

## Schritt 7: Alle Edge Functions deployen

### Einzelne Function deployen (zum Testen)
```bash
supabase functions deploy health
```

### Alle Functions auf einmal deployen

```bash
supabase functions deploy admin-delete-account
supabase functions deploy admin-remove-mfa
supabase functions deploy admin-update-profile
supabase functions deploy alias-request
supabase functions deploy assign-booster-badge
supabase functions deploy assign-discord-role
supabase functions deploy badge-request
supabase functions deploy ban-user
supabase functions deploy bot-api
supabase functions deploy bot-badge-requests
supabase functions deploy bot-command-notifications
supabase functions deploy bot-command-webhook
supabase functions deploy bot-commands
supabase functions deploy bot-verify-code
supabase functions deploy bulk-import-profiles
supabase functions deploy chat-ai
supabase functions deploy check-ban-status
supabase functions deploy claim-support-ticket
supabase functions deploy debug-fetch
supabase functions deploy delete-account
supabase functions deploy discord-oauth-callback
supabase functions deploy discord-oauth
supabase functions deploy discord-presence
supabase functions deploy encrypted-api
supabase functions deploy encrypted-chat-ai
supabase functions deploy event-notification
supabase functions deploy export-database
supabase functions deploy generate-verification-code
supabase functions deploy get-encryption-key
supabase functions deploy get-live-feed
supabase functions deploy get-paypal-config
supabase functions deploy get-user-email
supabase functions deploy mfa-email-otp
supabase functions deploy mfa-verify
supabase functions deploy minigame-data
supabase functions deploy minigame-reward
supabase functions deploy og-embed
supabase functions deploy og-html
supabase functions deploy og-profile
supabase functions deploy open-case
supabase functions deploy profile-comment
supabase functions deploy profile-like
supabase functions deploy publish-notification
supabase functions deploy receive-support-email
supabase functions deploy record-link-click
supabase functions deploy record-view
supabase functions deploy reply-support-email
supabase functions deploy report-user
supabase functions deploy reset-password
supabase functions deploy security-cleanup
supabase functions deploy sell-inventory-item
supabase functions deploy send-discord-message
supabase functions deploy send-email-change-code
supabase functions deploy send-password-reset
supabase secrets set send-premium-email
supabase functions deploy send-verification-email
supabase functions deploy share
supabase functions deploy signed-url
supabase functions deploy submit-ban-appeal
supabase functions deploy unban-user
supabase functions deploy validate-promo-code
supabase functions deploy verify-code
supabase functions deploy verify-email-change
supabase functions deploy verify-paypal-payment
supabase functions deploy verify-turnstile
```

### Oder als Batch-Script (Windows PowerShell)

Erstelle eine Datei `deploy-all.ps1`:
```powershell
$functions = @(
  "admin-delete-account",
  "admin-remove-mfa",
  "admin-update-profile",
  "alias-request",
  "assign-booster-badge",
  "assign-discord-role",
  "badge-request",
  "ban-user",
  "bot-api",
  "bot-badge-requests",
  "bot-command-notifications",
  "bot-command-webhook",
  "bot-commands",
  "bot-verify-code",
  "bulk-import-profiles",
  "chat-ai",
  "check-ban-status",
  "claim-support-ticket",
  "debug-fetch",
  "delete-account",
  "discord-oauth-callback",
  "discord-oauth",
  "discord-presence",
  "encrypted-api",
  "encrypted-chat-ai",
  "event-notification",
  "export-database",
  "generate-verification-code",
  "get-encryption-key",
  "get-live-feed",
  "get-paypal-config",
  "get-user-email",
  "health",
  "mfa-email-otp",
  "mfa-verify",
  "minigame-data",
  "minigame-reward",
  "og-embed",
  "og-html",
  "og-profile",
  "open-case",
  "profile-comment",
  "profile-like",
  "publish-notification",
  "receive-support-email",
  "record-link-click",
  "record-view",
  "reply-support-email",
  "report-user",
  "reset-password",
  "security-cleanup",
  "sell-inventory-item",
  "send-discord-message",
  "send-email-change-code",
  "send-password-reset",
  "send-premium-email",
  "send-verification-email",
  "share",
  "signed-url",
  "submit-ban-appeal",
  "unban-user",
  "validate-promo-code",
  "verify-code",
  "verify-email-change",
  "verify-paypal-payment",
  "verify-turnstile"
)

foreach ($fn in $functions) {
  Write-Host "Deploying $fn..." -ForegroundColor Cyan
  supabase functions deploy $fn
}

Write-Host "Done!" -ForegroundColor Green
```

Ausführen mit:
```powershell
.\deploy-all.ps1
```

---

## Schritt 8: Deployment überprüfen

Im Supabase Dashboard:
**Edge Functions** → Du solltest alle Functions mit Status "Active" sehen.

### Function testen
```bash
curl -X POST "https://nuszlhxbyxdjlaubuwzd.supabase.co/functions/v1/health" \
  -H "Authorization: Bearer DEIN_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## Schritt 9: Frontend URL anpassen

Wenn du das Frontend auf die externe Supabase umstellst, ändere die `.env`:

```env
VITE_SUPABASE_URL=https://nuszlhxbyxdjlaubuwzd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=nuszlhxbyxdjlaubuwzd
```

---

## Fehlerbehebung

### "Function failed to deploy"
- Prüfe ob `deno.lock` Probleme macht → lösche es und versuche erneut
- Prüfe Import-Pfade in der Function

### "Unauthorized" beim Aufruf
- Stelle sicher dass `verify_jwt = false` in `config.toml` gesetzt ist
- Prüfe ob der Auth-Header korrekt ist

### Secrets nicht verfügbar
```bash
supabase secrets list
```
Zeigt alle gesetzten Secrets.

---

## Wichtige Hinweise

1. **Secrets nie committen** – nutze immer `supabase secrets set`
2. **config.toml** muss `verify_jwt = false` haben für alle Functions
3. Bei Änderungen: erneut deployen mit `supabase functions deploy <name>`

---

## Quick Reference

| Befehl | Beschreibung |
|--------|-------------|
| `supabase login` | Bei Supabase anmelden |
| `supabase link --project-ref <id>` | Projekt verknüpfen |
| `supabase secrets set KEY="value"` | Secret setzen |
| `supabase secrets list` | Secrets anzeigen |
| `supabase functions deploy <name>` | Function deployen |
| `supabase functions list` | Alle Functions anzeigen |
| `supabase functions logs <name>` | Logs einer Function |
