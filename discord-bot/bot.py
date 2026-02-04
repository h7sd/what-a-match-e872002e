#!/usr/bin/env python3
"""
UserVault Discord Bot - Thin Client
====================================
A lightweight Discord bot that fetches all game logic from the UserVault API.
Just add your bot token and webhook secret to run.

Required environment variables:
- DISCORD_BOT_TOKEN: Your Discord bot token
- DISCORD_WEBHOOK_SECRET: Secret for signing API requests

Installation:
    pip install -r requirements.txt

Usage:
    python bot.py
"""

import os
import asyncio
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any, List

import discord
from discord import app_commands
from discord.ext import commands
import aiohttp
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the same directory as this script
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Debug: Print loading info
print(f"📁 Looking for .env at: {env_path}")
print(f"📁 .env exists: {env_path.exists()}")

# Configuration
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
WEBHOOK_SECRET = os.getenv("DISCORD_WEBHOOK_SECRET")

# IMPORTANT:
# If you run this bot against a different backend (e.g. Lovable Cloud),
# set one of these in your .env:
# - USERVAULT_FUNCTIONS_URL=https://<your-backend>/functions/v1
#   (or API_URL=..., FUNCTIONS_URL=...)
# Or set full URLs per function:
# - MINIGAME_DATA_URL=...
# - MINIGAME_REWARD_URL=...
# - BOT_COMMAND_NOTIFICATIONS_URL=...

FUNCTIONS_BASE_URL = (
    os.getenv("USERVAULT_FUNCTIONS_URL")
    or os.getenv("FUNCTIONS_URL")
    or os.getenv("API_URL")
    or "https://api.uservault.cc/functions/v1"
).rstrip("/")

GAME_API = os.getenv("MINIGAME_DATA_URL") or f"{FUNCTIONS_BASE_URL}/minigame-data"
REWARD_API = os.getenv("MINIGAME_REWARD_URL") or f"{FUNCTIONS_BASE_URL}/minigame-reward"
NOTIFICATIONS_API = (
    os.getenv("BOT_COMMAND_NOTIFICATIONS_URL")
    or f"{FUNCTIONS_BASE_URL}/bot-command-notifications"
)

print(f"📡 Using minigame-data: {GAME_API}")
print(f"📡 Using minigame-reward: {REWARD_API}")
print(f"📡 Using bot-command-notifications: {NOTIFICATIONS_API}")

# Channel for command update notifications
COMMAND_UPDATES_CHANNEL_ID = int(os.getenv("COMMAND_UPDATES_CHANNEL_ID", "1468730139012628622"))

# Validate configuration
if not BOT_TOKEN:
    raise ValueError("DISCORD_BOT_TOKEN is required!")
if not WEBHOOK_SECRET:
    raise ValueError("DISCORD_WEBHOOK_SECRET is required!")


class RequestLogger:
    """Logger for API requests with colors and timing."""
    
    COLORS = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'cyan': '\033[96m',
        'reset': '\033[0m',
        'bold': '\033[1m',
    }
    
    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
    
    def log(self, level: str, message: str):
        if not self.enabled:
            return
        
        timestamp = time.strftime("%H:%M:%S")
        color = self.COLORS.get(level, self.COLORS['reset'])
        reset = self.COLORS['reset']
        print(f"{self.COLORS['cyan']}[{timestamp}]{reset} {color}{message}{reset}")
    
    def request_start(self, endpoint: str, action: str, user_id: str = None):
        self.request_count += 1
        user_info = f" (User: {user_id})" if user_id else ""
        self.log('blue', f"📡 REQUEST #{self.request_count}: {action} → {endpoint}{user_info}")
    
    def request_success(self, action: str, duration_ms: float, response_preview: str = ""):
        self.success_count += 1
        preview = f" | {response_preview[:50]}..." if len(response_preview) > 50 else f" | {response_preview}" if response_preview else ""
        self.log('green', f"✅ SUCCESS: {action} ({duration_ms:.0f}ms){preview}")
    
    def request_error(self, action: str, error: str, status_code: int = None):
        self.error_count += 1
        status = f" [HTTP {status_code}]" if status_code else ""
        self.log('red', f"❌ ERROR: {action}{status} - {error}")
    
    def stats(self):
        total = self.request_count
        success_rate = (self.success_count / total * 100) if total > 0 else 0
        self.log('yellow', f"📊 STATS: {total} requests | {self.success_count} success | {self.error_count} errors | {success_rate:.1f}% success rate")


# Global request logger
request_logger = RequestLogger(enabled=True)


class UserVaultAPI:
    """API client for UserVault minigame endpoints."""
    
    def __init__(self, webhook_secret: str):
        self.webhook_secret = webhook_secret
        self.session: Optional[aiohttp.ClientSession] = None
        self.logger = request_logger
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _generate_signature(self, payload_json: str) -> tuple[str, str]:
        """Generate HMAC signature for reward API calls.

        IMPORTANT: The signature must be created from the exact raw JSON string
        that is sent as the HTTP request body. Otherwise the backend will reject
        with "Invalid signature".
        """
        timestamp = str(int(time.time() * 1000))
        message = f"{timestamp}.{payload_json}"
        signature = hmac.new(
            self.webhook_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return signature, timestamp
    
    async def game_api(self, action: str, **params) -> dict:
        """Call the game API (no auth needed - just game logic)."""
        session = await self._get_session()
        payload = {"action": action, **params}
        
        self.logger.request_start("minigame-data", action)
        start_time = time.time()
        
        try:
            async with session.post(GAME_API, json=payload) as response:
                duration_ms = (time.time() - start_time) * 1000
                result = await response.json()
                
                if response.status == 200 and not result.get("error"):
                    preview = json.dumps(result)[:100] if result else ""
                    self.logger.request_success(action, duration_ms, preview)
                else:
                    self.logger.request_error(action, result.get("error", "Unknown error"), response.status)
                
                return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.logger.request_error(action, str(e))
            return {"error": str(e)}
    
    async def reward_api(self, action: str, discord_user_id: str, **extra) -> dict:
        """Call the reward API (needs webhook secret)."""
        session = await self._get_session()
        payload = {"action": action, "discordUserId": discord_user_id, **extra}
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        signature, timestamp = self._generate_signature(payload_json)
        
        headers = {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
        }
        
        self.logger.request_start("minigame-reward", action, discord_user_id)
        start_time = time.time()
        
        try:
            async with session.post(
                REWARD_API,
                data=payload_json.encode("utf-8"),
                headers=headers,
            ) as response:
                duration_ms = (time.time() - start_time) * 1000
                result = await response.json()
                
                if response.status == 200 and not result.get("error"):
                    preview = json.dumps(result)[:100] if result else ""
                    self.logger.request_success(action, duration_ms, preview)
                else:
                    self.logger.request_error(action, result.get("error", "Unknown error"), response.status)
                
                return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.logger.request_error(action, str(e))
            return {"error": str(e)}
    
    # ============ GAME METHODS ============
    
    async def get_available_games(self) -> dict:
        """Get list of available games from API."""
        return await self.game_api("get_games")
    
    async def get_all_commands(self) -> dict:
        """Get all available commands (games + utilities) from API."""
        return await self.game_api("get_commands")
    
    async def link_account(self, discord_user_id: str, username: str) -> dict:
        """Link Discord account to UserVault."""
        return await self.reward_api("link_account", discord_user_id, username=username)
    
    async def unlink_account(self, discord_user_id: str) -> dict:
        """Unlink Discord account from UserVault."""
        return await self.reward_api("unlink_account", discord_user_id)
    
    async def get_profile(self, discord_user_id: str) -> dict:
        """Get UserVault profile for Discord user."""
        return await self.reward_api("get_profile", discord_user_id)
    
    async def get_trivia(self) -> dict:
        """Get a trivia question."""
        return await self.game_api("get_trivia")
    
    async def check_trivia(self, question: str, answer: str) -> dict:
        """Check trivia answer."""
        return await self.game_api("check_trivia", question=question, answer=answer)
    
    async def spin_slots(self) -> dict:
        """Spin the slot machine."""
        return await self.game_api("spin_slots")
    
    async def flip_coin(self) -> dict:
        """Flip a coin."""
        return await self.game_api("coin_flip")
    
    async def play_rps(self, choice: str) -> dict:
        """Play rock paper scissors."""
        return await self.game_api("play_rps", choice=choice)
    
    async def generate_number(self) -> dict:
        """Generate a secret number for guessing game."""
        return await self.game_api("generate_number")
    
    async def check_guess(self, secret: int, guess: int, attempts: int = 5) -> dict:
        """Check a number guess."""
        return await self.game_api("check_guess", secret=secret, guess=guess, attempts=attempts)
    
    async def start_blackjack(self, bet: int = 50) -> dict:
        """Start a blackjack game."""
        return await self.game_api("start_blackjack", bet=bet)
    
    async def blackjack_hit(self, deck: list, player_hand: list) -> dict:
        """Hit in blackjack."""
        return await self.game_api("blackjack_hit", deck=deck, playerHand=player_hand)
    
    async def blackjack_stand(self, deck: list, dealer_hand: list, player_value: int) -> dict:
        """Stand in blackjack."""
        return await self.game_api("blackjack_stand", deck=deck, dealerHand=dealer_hand, playerValue=player_value)
    
    async def get_game_config(self) -> dict:
        """Get game configuration."""
        return await self.game_api("get_config")
    
    # ============ REWARD METHODS ============
    
    async def send_reward(self, discord_user_id: str, amount: int, game_type: str, description: str) -> dict:
        """Send a reward to a user."""
        return await self.reward_api(
            "add_uv", 
            discord_user_id, 
            amount=amount, 
            gameType=game_type, 
            description=description
        )
    
    async def get_balance(self, discord_user_id: str) -> dict:
        """Get a user's balance."""
        return await self.reward_api("get_balance", discord_user_id)
    
    async def claim_daily(self, discord_user_id: str) -> dict:
        """Claim daily reward."""
        return await self.reward_api("daily_reward", discord_user_id)
    
    # ============ COMMAND NOTIFICATIONS ============
    
    async def get_pending_notifications(self) -> dict:
        """Get pending command notifications from queue."""
        session = await self._get_session()
        payload = {"action": "get_pending"}
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        signature, timestamp = self._generate_signature(payload_json)
        
        headers = {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
        }
        
        try:
            async with session.post(
                NOTIFICATIONS_API,
                data=payload_json.encode("utf-8"),
                headers=headers,
            ) as response:
                return await response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def mark_notification_processed(self, notification_id: str) -> dict:
        """Mark a notification as processed."""
        session = await self._get_session()
        payload = {"action": "mark_processed", "notificationId": notification_id}
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        signature, timestamp = self._generate_signature(payload_json)
        
        headers = {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
        }
        
        try:
            async with session.post(
                NOTIFICATIONS_API,
                data=payload_json.encode("utf-8"),
                headers=headers,
            ) as response:
                return await response.json()
        except Exception as e:
            return {"error": str(e)}


class TriviaView(discord.ui.View):
    """View for trivia answers."""
    
    def __init__(self, bot: "UserVaultBot", trivia_data: dict, user_id: int):
        super().__init__(timeout=60)
        self.bot = bot
        self.trivia_data = trivia_data
        self.user_id = user_id
        
        # Create select menu with options
        select = discord.ui.Select(
            placeholder="Choose your answer...",
            options=[
                discord.SelectOption(label=opt, value=str(i))
                for i, opt in enumerate(trivia_data.get("options", []))
            ]
        )
        select.callback = self.on_select
        self.add_item(select)
    
    async def on_select(self, interaction: discord.Interaction):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This isn't your game!", ephemeral=True)
            return
        
        selected_index = int(interaction.data["values"][0])
        selected_answer = self.trivia_data["options"][selected_index]
        
        result = await self.bot.api.check_trivia(self.trivia_data["question"], selected_answer)
        
        content = f"🎯 **Trivia**\n\n{self.trivia_data['question']}\n\n"
        
        if result.get("correct"):
            reward = result.get("reward", 25)
            content += f"✅ **Correct!** +{reward} UC"
            await self.bot.api.send_reward(str(interaction.user.id), reward, "trivia", "Trivia correct")
        else:
            content += f"❌ Wrong! The answer was: **{result.get('correctAnswer', 'Unknown')}**"
        
        await interaction.response.edit_message(content=content, view=None)
        self.stop()


class BlackjackView(discord.ui.View):
    """View for blackjack game."""
    
    def __init__(self, bot: "UserVaultBot", game_data: dict, user_id: int):
        super().__init__(timeout=120)
        self.bot = bot
        self.game_data = game_data
        self.user_id = user_id
    
    @discord.ui.button(label="Hit", style=discord.ButtonStyle.primary)
    async def hit(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This isn't your game!", ephemeral=True)
            return
        
        result = await self.bot.api.blackjack_hit(
            self.game_data["deck"], 
            self.game_data["playerHand"]
        )
        
        # Update game state
        self.game_data.update(result)
        
        content = (
            f"🃏 **Blackjack** (Bet: 50 UC)\n\n"
            f"Your hand: {result['playerDisplay']} ({result['playerValue']})\n"
            f"Dealer: {self.game_data['dealerDisplay']}"
        )
        
        if result.get("busted"):
            content += "\n\n💥 **BUST! You lose!**"
            await interaction.response.edit_message(content=content, view=None)
            self.stop()
        else:
            await interaction.response.edit_message(content=content, view=self)
    
    @discord.ui.button(label="Stand", style=discord.ButtonStyle.secondary)
    async def stand(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This isn't your game!", ephemeral=True)
            return
        
        result = await self.bot.api.blackjack_stand(
            self.game_data["deck"],
            self.game_data["dealerHand"],
            self.game_data["playerValue"]
        )
        
        content = (
            f"🃏 **Blackjack** (Bet: 50 UC)\n\n"
            f"Your hand: {self.game_data['playerDisplay']} ({self.game_data['playerValue']})\n"
            f"Dealer: {result['dealerDisplay']} ({result['dealerValue']})\n\n"
        )
        
        if result.get("result") == "win":
            payout = result.get("payout", 100)
            content += f"🎉 **You win! +{payout} UC**"
            await self.bot.api.send_reward(str(interaction.user.id), payout, "blackjack", "Blackjack win")
        elif result.get("result") == "lose":
            content += "❌ **Dealer wins!**"
        else:
            content += "🤝 **Push! Bet returned.**"
        
        await interaction.response.edit_message(content=content, view=None)
        self.stop()


class UserVaultBot(commands.Bot):
    """Main Discord bot class."""
    
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)
        
        self.api = UserVaultAPI(WEBHOOK_SECRET)
        self.active_guess_games: Dict[int, dict] = {}
        self.notification_task: Optional[asyncio.Task] = None
    
    async def setup_hook(self):
        """Called when the bot is ready to set up commands."""
        # Fetch available commands from API
        print("📡 Fetching commands from API...")
        try:
            cmd_data = await self.api.get_all_commands()
            if cmd_data.get("games"):
                print(f"✅ Loaded {len(cmd_data['games'])} games from API")
            if cmd_data.get("utilities"):
                print(f"✅ Loaded {len(cmd_data['utilities'])} utility commands from API")
        except Exception as e:
            print(f"⚠️ Could not fetch commands from API: {e}")
        
        # Register all commands (game commands)
        self.tree.add_command(trivia)
        self.tree.add_command(slots)
        self.tree.add_command(coin)
        self.tree.add_command(rps)
        self.tree.add_command(blackjack)
        self.tree.add_command(guess)
        self.tree.add_command(balance)
        self.tree.add_command(daily)
        
        # Register utility commands
        self.tree.add_command(link)
        self.tree.add_command(unlink)
        self.tree.add_command(profile)
        self.tree.add_command(apistats)
        
        # Sync commands
        await self.tree.sync()
        print("✅ Commands synced!")
    
    async def on_ready(self):
        print(f"🤖 Bot ready: {self.user}")
        print(f"📊 Connected to {len(self.guilds)} guilds")
        
        # Start notification polling
        if self.notification_task is None or self.notification_task.done():
            self.notification_task = asyncio.create_task(self.poll_notifications())
            print("📡 Started command notification polling")
    
    async def poll_notifications(self):
        """Poll for command notifications and send to Discord."""
        await self.wait_until_ready()
        
        channel = self.get_channel(COMMAND_UPDATES_CHANNEL_ID)
        if not channel:
            print(f"⚠️ Could not find channel {COMMAND_UPDATES_CHANNEL_ID} for command notifications")
            return
        
        print(f"📢 Sending command updates to #{channel.name}")
        
        while not self.is_closed():
            try:
                result = await self.api.get_pending_notifications()
                
                if result.get("notifications"):
                    for notif in result["notifications"]:
                        await self.send_command_notification(channel, notif)
                        await self.api.mark_notification_processed(notif["id"])
                        
            except Exception as e:
                print(f"❌ Notification poll error: {e}")
            
            # Poll every 5 seconds
            await asyncio.sleep(5)
    
    async def send_command_notification(self, channel, notif: dict):
        """Send a command notification embed to Discord."""
        action = notif.get("action", "unknown")
        command_name = notif.get("command_name", "unknown")
        changes = notif.get("changes") or {}
        
        colors = {
            "created": 0x22c55e,  # green
            "updated": 0xf59e0b,  # amber
            "deleted": 0xef4444,  # red
        }
        
        emojis = {
            "created": "✨",
            "updated": "📝",
            "deleted": "🗑️",
        }
        
        embed = discord.Embed(
            title=f"{emojis.get(action, '📋')} Command {action.capitalize()}",
            description=f"**`/{command_name}`** was {action}",
            color=colors.get(action, 0x6366f1),
            timestamp=discord.utils.utcnow()
        )
        
        embed.add_field(
            name="⏰ Timestamp",
            value=f"<t:{int(time.time())}:F>",
            inline=True
        )
        
        if changes:
            changes_text = "\n".join([f"• **{k}**: {v}" for k, v in changes.items()])
            embed.add_field(
                name="📋 Changes",
                value=changes_text[:1024],
                inline=False
            )
        
        embed.set_footer(text="UserVault Command System")
        
        try:
            await channel.send(embed=embed)
            print(f"📤 Sent notification: {action} /{command_name}")
        except Exception as e:
            print(f"❌ Failed to send notification: {e}")
    
    async def close(self):
        if self.notification_task:
            self.notification_task.cancel()
        await self.api.close()
        await super().close()


# Create bot instance
bot = UserVaultBot()


# ============ SLASH COMMANDS ============

@app_commands.command(name="trivia", description="🎯 Answer questions and win UC!")
async def trivia(interaction: discord.Interaction):
    await interaction.response.defer()
    
    trivia_data = await bot.api.get_trivia()
    view = TriviaView(bot, trivia_data, interaction.user.id)
    
    content = (
        f"🎯 **Trivia**\n\n"
        f"{trivia_data.get('question', 'Loading...')}\n\n"
        f"*Category: {trivia_data.get('category', 'General')}*"
    )
    
    await interaction.followup.send(content, view=view)


@app_commands.command(name="slots", description="🎰 Spin the slot machine!")
async def slots(interaction: discord.Interaction):
    await interaction.response.defer()
    
    result = await bot.api.spin_slots()
    payout = result.get("payout", 0)
    display = result.get("display", "🎰 🎰 🎰")
    
    result_text = f"🎉 **WIN! +{payout} UC**" if payout > 0 else "❌ No match"
    
    await interaction.followup.send(f"🎰 **Slots**\n\n{display}\n\n{result_text}")
    
    if payout > 0:
        await bot.api.send_reward(str(interaction.user.id), payout, "slots", "Slots win")


@app_commands.command(name="coin", description="🪙 Flip a coin - heads or tails?")
@app_commands.choices(choice=[
    app_commands.Choice(name="Heads", value="heads"),
    app_commands.Choice(name="Tails", value="tails"),
])
async def coin(interaction: discord.Interaction, choice: app_commands.Choice[str]):
    await interaction.response.defer()
    
    result = await bot.api.flip_coin()
    won = result.get("result") == choice.value
    emoji = result.get("emoji", "🪙")
    
    content = (
        f"🪙 **Coinflip**\n\n"
        f"{emoji} The coin landed on **{result.get('result', 'unknown')}**!\n\n"
    )
    
    if won:
        content += "🎉 **You won! +10 UC**"
        await bot.api.send_reward(str(interaction.user.id), 10, "coinflip", "Coinflip win")
    else:
        content += "❌ Better luck next time!"
    
    await interaction.followup.send(content)


@app_commands.command(name="rps", description="✂️ Rock Paper Scissors!")
@app_commands.choices(choice=[
    app_commands.Choice(name="🪨 Rock", value="rock"),
    app_commands.Choice(name="📄 Paper", value="paper"),
    app_commands.Choice(name="✂️ Scissors", value="scissors"),
])
async def rps(interaction: discord.Interaction, choice: app_commands.Choice[str]):
    await interaction.response.defer()
    
    result = await bot.api.play_rps(choice.value)
    
    if result.get("error"):
        await interaction.followup.send(f"❌ Error: {result['error']}")
        return
    
    game_result = result.get("result", "tie")
    player_emoji = result.get("playerEmoji", "❓")
    bot_emoji = result.get("botEmoji", "❓")
    
    content = f"✂️ **Rock Paper Scissors**\n\nYou: {player_emoji}  vs  Bot: {bot_emoji}\n\n"
    
    if game_result == "win":
        reward = result.get("reward", 15)
        content += f"🎉 **You won! +{reward} UC**"
        await bot.api.send_reward(str(interaction.user.id), reward, "rps", "RPS win")
    elif game_result == "lose":
        content += "❌ You lost!"
    else:
        content += "🤝 It's a tie!"
    
    await interaction.followup.send(content)


@app_commands.command(name="blackjack", description="🃏 Play 21 against the dealer!")
async def blackjack(interaction: discord.Interaction):
    await interaction.response.defer()
    
    game_data = await bot.api.start_blackjack(50)
    
    content = (
        f"🃏 **Blackjack** (Bet: 50 UC)\n\n"
        f"Your hand: {game_data.get('playerDisplay', '??')} ({game_data.get('playerValue', 0)})\n"
        f"Dealer: {game_data.get('dealerDisplay', '??')}"
    )
    
    if game_data.get("playerValue") == 21:
        content += "\n\n🎉 **BLACKJACK! +75 UC**"
        await bot.api.send_reward(str(interaction.user.id), 75, "blackjack", "Blackjack!")
        await interaction.followup.send(content)
    else:
        view = BlackjackView(bot, game_data, interaction.user.id)
        await interaction.followup.send(content, view=view)


@app_commands.command(name="guess", description="🔢 Guess the number (1-100)!")
async def guess(interaction: discord.Interaction):
    await interaction.response.defer()
    
    result = await bot.api.generate_number()
    bot.active_guess_games[interaction.user.id] = {
        "secret": result.get("secret"),
        "attempts": 5,
        "channel_id": interaction.channel.id
    }
    
    await interaction.followup.send(
        "🔢 **Guess the Number**\n\n"
        "I'm thinking of a number between 1 and 100.\n"
        "You have 5 attempts!\n\n"
        "Type a number in chat to guess."
    )


@app_commands.command(name="balance", description="💰 Check your UC balance")
async def balance(interaction: discord.Interaction):
    await interaction.response.defer()
    
    result = await bot.api.get_balance(str(interaction.user.id))
    
    if result.get("error"):
        await interaction.followup.send(f"❌ Error: {result['error']}")
    else:
        await interaction.followup.send(
            f"💰 **Your Balance**\n\n"
            f"Balance: **{result.get('balance', 0)} UC**\n"
            f"Total Earned: {result.get('totalEarned', 0)} UC"
        )


@app_commands.command(name="daily", description="📅 Claim your daily UC reward")
async def daily(interaction: discord.Interaction):
    await interaction.response.defer()
    
    result = await bot.api.claim_daily(str(interaction.user.id))
    
    if result.get("error"):
        await interaction.followup.send(f"❌ {result['error']}")
    else:
        await interaction.followup.send(
            f"📅 **Daily Reward**\n\n"
            f"🎉 Claimed **{result.get('reward', 50)} UC**!\n"
            f"🔥 Streak: {result.get('streak', 1)} days\n"
            f"💰 New Balance: {result.get('newBalance', 0)} UC"
        )


@app_commands.command(name="apistats", description="📊 Show API request statistics")
async def apistats(interaction: discord.Interaction):
    """Show current API request statistics."""
    logger = request_logger
    total = logger.request_count
    success_rate = (logger.success_count / total * 100) if total > 0 else 0
    
    await interaction.response.send_message(
        f"📊 **API Request Statistics**\n\n"
        f"📡 Total Requests: **{total}**\n"
        f"✅ Successful: **{logger.success_count}**\n"
        f"❌ Errors: **{logger.error_count}**\n"
        f"📈 Success Rate: **{success_rate:.1f}%**",
        ephemeral=True
    )


# ============ UTILITY COMMANDS ============

@app_commands.command(name="link", description="🔗 Link your Discord to your UserVault account")
async def link(interaction: discord.Interaction, username: str):
    """Link Discord account to UserVault."""
    await interaction.response.defer(ephemeral=True)
    
    result = await bot.api.link_account(str(interaction.user.id), username)
    
    if result.get("error"):
        await interaction.followup.send(f"❌ {result['error']}", ephemeral=True)
    elif result.get("success"):
        await interaction.followup.send(
            f"🔗 **Account Linked!**\n\n"
            f"✅ Your Discord is now linked to **{username}**\n"
            f"💰 You can now earn UC from games!",
            ephemeral=True
        )
    else:
        await interaction.followup.send(
            f"⏳ **Verification Required**\n\n"
            f"Please verify on UserVault to complete the link.\n"
            f"Check your UserVault dashboard for the verification code.",
            ephemeral=True
        )


@app_commands.command(name="unlink", description="🔓 Unlink your Discord from UserVault")
async def unlink(interaction: discord.Interaction):
    """Unlink Discord account from UserVault."""
    await interaction.response.defer(ephemeral=True)
    
    result = await bot.api.unlink_account(str(interaction.user.id))
    
    if result.get("error"):
        await interaction.followup.send(f"❌ {result['error']}", ephemeral=True)
    else:
        await interaction.followup.send(
            f"🔓 **Account Unlinked**\n\n"
            f"Your Discord has been unlinked from UserVault.",
            ephemeral=True
        )


@app_commands.command(name="profile", description="👤 View your UserVault profile")
async def profile(interaction: discord.Interaction):
    """View UserVault profile."""
    await interaction.response.defer()
    
    result = await bot.api.get_profile(str(interaction.user.id))
    
    if result.get("error"):
        if "not linked" in result.get("error", "").lower():
            await interaction.followup.send(
                f"❌ **Not Linked**\n\n"
                f"Use `/link <username>` to link your Discord to UserVault first!",
            )
        else:
            await interaction.followup.send(f"❌ {result['error']}")
    else:
        username = result.get("username", "Unknown")
        balance = result.get("balance", 0)
        total_earned = result.get("totalEarned", 0)
        profile_url = f"https://uservault.cc/{username}"
        
        await interaction.followup.send(
            f"👤 **UserVault Profile**\n\n"
            f"**Username:** {username}\n"
            f"💰 **Balance:** {balance} UC\n"
            f"📈 **Total Earned:** {total_earned} UC\n"
            f"🔗 **Profile:** {profile_url}"
        )


# ============ MESSAGE HANDLER FOR GUESS GAME ============

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return
    
    # Check if user has an active guess game
    game = bot.active_guess_games.get(message.author.id)
    if game and message.channel.id == game["channel_id"]:
        try:
            guess_num = int(message.content)
            if 1 <= guess_num <= 100:
                game["attempts"] -= 1
                
                result = await bot.api.check_guess(
                    game["secret"], 
                    guess_num,
                    game["attempts"]
                )
                
                if result.get("correct"):
                    reward = result.get("reward", 50)
                    await message.reply(
                        f"🎉 **Correct!** The number was {guess_num}! **+{reward} UC**"
                    )
                    await bot.api.send_reward(
                        str(message.author.id), 
                        reward, 
                        "guess", 
                        "Number guess"
                    )
                    del bot.active_guess_games[message.author.id]
                elif game["attempts"] == 0:
                    await message.reply(
                        f"❌ Out of attempts! The number was {result.get('answer', '???')}."
                    )
                    del bot.active_guess_games[message.author.id]
                else:
                    hint = result.get("hint", "Try again!")
                    await message.reply(f"{hint} ({game['attempts']} attempts left)")
        except ValueError:
            pass  # Not a number, ignore
    
    await bot.process_commands(message)


# ============ SETUP FUNCTION FOR COG/EXTENSION LOADING ============

async def setup(client: commands.Bot):
    """
    Setup function for loading as a discord.py extension/cog.
    Required when using bot.load_extension('bot') or similar.
    """
    # Register all commands to the client's command tree
    client.tree.add_command(trivia)
    client.tree.add_command(slots)
    client.tree.add_command(coin)
    client.tree.add_command(rps)
    client.tree.add_command(blackjack)
    client.tree.add_command(guess)
    client.tree.add_command(balance)
    client.tree.add_command(daily)
    
    # If the client has an API attribute, use it; otherwise create one
    if not hasattr(client, 'api'):
        client.api = UserVaultAPI(WEBHOOK_SECRET)
    if not hasattr(client, 'active_guess_games'):
        client.active_guess_games = {}
    
    print("✅ UserVault API Bot extension loaded!")


# ============ RUN BOT ============

if __name__ == "__main__":
    print("🚀 Starting UserVault Bot...")
    print(f"📡 API URL: {API_URL}")
    bot.run(BOT_TOKEN)
