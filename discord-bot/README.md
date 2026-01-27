# UserVault Discord Presence Bot

Trackt die Discord Presence aller User in deinem Server.

## Setup

### 1. Bot erstellen

1. https://discord.com/developers/applications → "New Application"
2. Bot → Add Bot
3. **WICHTIG**: Aktiviere:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
4. Token kopieren

### 2. Bot einladen

```
https://discord.com/api/oauth2/authorize?client_id=DEINE_APP_ID&permissions=0&scope=bot
```

### 3. .env erstellen

```bash
cp .env.example .env
nano .env
```

Eintragen:
```
DISCORD_BOT_TOKEN=dein_bot_token
EDGE_FUNCTION_URL=https://cjulgfbmcnmrkvnzkpym.supabase.co/functions/v1/discord-presence
GUILD_ID=deine_server_id
```

### 4. Starten

```bash
npm install
npm start
```

### 5. Mit PM2 (für 24/7)

```bash
npm install -g pm2
pm2 start index.js --name uservault-bot
pm2 save
pm2 startup
```

## Features

✅ Keine Supabase Keys nötig - alles über Edge Function
✅ Trackt Status, Games, Spotify
✅ Automatische Reconnection
✅ Rate Limit Handling

## Logs

```
✅ username: online - Spotify
✅ username: dnd - Grand Theft Auto V
```
