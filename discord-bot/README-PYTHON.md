# UserVault Discord Bot (Python)

Ein schlanker Discord-Bot, der alle Spiellogik von der UserVault API lädt.

## 🚀 Quick Start

### 1. Python installieren
Benötigt Python 3.10+

### 2. Dependencies installieren
```bash
cd discord-bot
pip install -r requirements.txt
```

### 3. Konfiguration
Erstelle eine `.env` Datei:
```env
DISCORD_BOT_TOKEN=dein_bot_token
DISCORD_WEBHOOK_SECRET=dein_webhook_secret
```

### 4. Bot starten
```bash
python bot.py
```

## 📋 Verfügbare Commands

| Command | Beschreibung |
|---------|-------------|
| `/trivia` | 🎯 Beantworte Fragen und gewinne UC! |
| `/slots` | 🎰 Dreh die Slotmaschine! |
| `/coin` | 🪙 Münze werfen - Kopf oder Zahl? |
| `/rps` | ✂️ Schere Stein Papier! |
| `/blackjack` | 🃏 Spiele 21 gegen den Dealer! |
| `/guess` | 🔢 Rate die Zahl (1-100)! |
| `/balance` | 💰 Zeige dein UC Guthaben |
| `/daily` | 📅 Hole deine tägliche Belohnung |

## 🏗️ Architektur

```
Bot (Python)  ──►  UserVault API
   │                   │
   │  Commands         │  Spiellogik
   │  UI/Buttons       │  Belohnungen
   │  State            │  Datenbank
   └───────────────────┘
```

Der Bot ist ein **Thin Client**:
- Alle Spiellogik läuft auf der UserVault API
- Bot zeigt nur UI und verarbeitet Interaktionen
- Belohnungen werden sicher über HMAC signiert

## 🔒 Sicherheit

- API-Aufrufe für Belohnungen sind HMAC-SHA256 signiert
- Timestamps verhindern Replay-Attacken
- Webhook Secret niemals teilen!

## 📁 Dateien

```
discord-bot/
├── bot.py              # Hauptdatei
├── requirements.txt    # Dependencies
├── .env.example.py     # Beispiel-Konfiguration
└── README-PYTHON.md    # Diese Datei
```

## 🔧 Entwicklung

### API-Endpunkte

- `https://api.uservault.cc/functions/v1/minigame-data` - Spiellogik (öffentlich)
- `https://api.uservault.cc/functions/v1/minigame-reward` - Belohnungen (signiert)

### Neue Spiele hinzufügen

1. Neuen Slash-Command erstellen
2. API-Methode in `UserVaultAPI` Klasse hinzufügen
3. Command in `setup_hook()` registrieren

## 💡 Tipps

- Der Bot synct Commands automatisch beim Start
- Für Entwicklung: Nutze einen Test-Server
- Logs zeigen alle API-Aufrufe
