# Cloudflare Workers für UserVault

Dieses Verzeichnis enthält zwei Cloudflare Workers:

## 1. `og-proxy.js` - Open Graph Proxy
Handhabt Bot-Erkennung für Discord/Twitter Embeds und leitet normale User an die Lovable App weiter.

**Route:** `uservault.cc/*` (alle Routen)

## 2. `api-proxy.js` - Supabase API Proxy (NEU)
Versteckt die Supabase URL vor Browser Dev Tools, indem alle API-Requests über deine eigene Domain geleitet werden.

**Route:** `api.uservault.cc/*` (oder `uservault.cc/api/*`)

---

## Setup für API Proxy

### Option A: Subdomain (Empfohlen)
1. Erstelle einen neuen Worker in Cloudflare mit dem Code aus `api-proxy.js`
2. Füge eine Custom Domain hinzu: `api.uservault.cc`
3. Ändere die Supabase Client Config (siehe unten)

### Option B: Path-basiert (Einfacher)
1. Erweitere den `og-proxy.js` Worker um die API-Proxy Logik
2. Alle `/rest/v1/*`, `/auth/v1/*`, `/storage/v1/*` und `/functions/v1/*` Pfade werden zu Supabase weitergeleitet

---

## Client Konfiguration

Nach dem Setup des Workers, ändere die Supabase Client URL in deiner App:

```typescript
// VORHER (zeigt Supabase URL in Dev Tools)
const SUPABASE_URL = "https://cjulgfbmcnmrkvnzkpym.supabase.co";

// NACHHER (versteckt Supabase URL)
const SUPABASE_URL = "https://api.uservault.cc";
// oder
const SUPABASE_URL = "https://uservault.cc";  // wenn path-basiert
```

**WICHTIG:** Da `src/integrations/supabase/client.ts` automatisch generiert wird, musst du:

1. Eine `.env` Variable verwenden (falls Lovable das unterstützt)
2. Oder einen Wrapper um den Supabase Client erstellen

---

## Proxy-Pfade

Der API-Proxy leitet diese Pfade weiter:

| Pfad | Beschreibung |
|------|--------------|
| `/rest/v1/*` | PostgREST API (Datenbankabfragen) |
| `/auth/v1/*` | Auth API (Login, Signup, etc.) |
| `/storage/v1/*` | Storage API (Datei-Uploads) |
| `/functions/v1/*` | Edge Functions |
| `/realtime/v1/*` | Realtime WebSocket |

---

## Sicherheitshinweise

- Der Worker leitet NUR die Supabase-API Pfade weiter
- Der tatsächliche Supabase Project Key bleibt im Worker-Code (nicht öffentlich)
- API Keys werden weiterhin vom Client gesendet (das ist normal und sicher für anon keys)
- Für zusätzliche Sicherheit: Verwende Supabase RLS Policies
