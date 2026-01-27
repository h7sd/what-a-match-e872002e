# UserVault Discord Presence Bot

Trackt die Discord Presence aller User in deinem Server und speichert sie in Supabase.

## Setup

### 1. Bot im Discord Developer Portal erstellen

1. Gehe zu https://discord.com/developers/applications
2. Klicke "New Application" → Name: "UserVault Bot"
3. Gehe zu "Bot" → "Add Bot"
4. **WICHTIG**: Aktiviere diese Intents:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
5. Kopiere den Bot Token

### 2. Bot zu deinem Server einladen

Ersetze `YOUR_CLIENT_ID` mit deiner Application ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot
```

### 3. Supabase Service Role Key holen

1. Gehe zu Cloud View → Settings
2. Kopiere den Service Role Key (NICHT den anon key!)

### 4. .env Datei erstellen

```bash
cp .env.example .env
```

Dann die Werte eintragen:
- `DISCORD_BOT_TOKEN` = Dein Bot Token
- `SUPABASE_URL` = https://cjulgfbmcnmrkvnzkpym.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = Dein Service Role Key
- `GUILD_ID` = Deine Server ID (Rechtsklick auf Server → ID kopieren)

### 5. Bot starten

```bash
# Dependencies installieren
npm install

# Bot starten
npm start

# Oder mit auto-restart (pm2)
npm install -g pm2
pm2 start index.js --name uservault-bot
pm2 save
pm2 startup
```

## Features

- ✅ Trackt Online/Idle/DND/Offline Status
- ✅ Zeigt aktuelle Spiele an
- ✅ Zeigt Spotify "Now Playing"
- ✅ Automatische Reconnection bei Disconnect
- ✅ Initial Sync beim Start
- ✅ Graceful Shutdown

## Logs

Der Bot loggt alle Presence Updates:
```
✅ Updated presence for username: online - Spotify
✅ Updated presence for username: dnd - Grand Theft Auto V
```

## Troubleshooting

**Bot startet nicht:**
- Prüfe ob alle ENV Variablen gesetzt sind
- Prüfe ob der Bot Token korrekt ist

**Presence wird nicht getrackt:**
- Prüfe ob PRESENCE INTENT aktiviert ist
- Prüfe ob die GUILD_ID korrekt ist
- User muss eine verknüpfte discord_user_id in seinem Profil haben
