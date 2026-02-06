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
import inspect
import json
import re
import time
import random
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
BOT_CODE_VERSION = "2026-02-06-admin-cmds-impl-v1"
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
WEBHOOK_SECRET = os.getenv("DISCORD_WEBHOOK_SECRET")

# Flag to check if we're being loaded as extension vs standalone
_RUNNING_AS_EXTENSION = False

# Cache for dynamically loaded commands from API
_CACHED_BOT_COMMANDS: Dict[str, Any] = {}
_COMMANDS_LAST_FETCHED: float = 0
_COMMANDS_CACHE_TTL: int = 60  # Refresh commands every 60 seconds

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

# Slash commands are optional. If you want ONLY prefix commands (?), keep this false.
ENABLE_SLASH_COMMANDS = os.getenv("ENABLE_SLASH_COMMANDS", "false").strip().lower() in {"1", "true", "yes"}

# Only validate in standalone mode - extensions get config from host bot
def _validate_standalone_config():
    """Validate configuration only when running standalone."""
    if not BOT_TOKEN:
        raise ValueError("DISCORD_BOT_TOKEN is required!")
    if not WEBHOOK_SECRET:
        raise ValueError("DISCORD_WEBHOOK_SECRET is required!")


def safe_int_balance(value: Any) -> int:
    """
    Safely convert any balance value to int.
    
    Handles:
    - Strings with commas (e.g., "1,234,567")
    - Strings with decimals (e.g., "1234.56")
    - Negative numbers (e.g., "-500")
    - BigInt strings from API
    - None/empty values
    - Already int values
    """
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            # Remove commas, spaces, and take integer part
            cleaned = value.replace(",", "").replace(" ", "").strip()
            if not cleaned or cleaned == "":
                return 0
            # Handle decimals by taking the integer part
            if "." in cleaned:
                cleaned = cleaned.split(".")[0]
            return int(cleaned)
        except (ValueError, AttributeError):
            return 0
    # Fallback for any other type
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0



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
    
    async def link_account(self, discord_user_id: str, code: str) -> dict:
        """Link Discord account to UserVault using verification code."""
        # Use the new bot-verify-code endpoint for secure linking
        verify_url = os.getenv("BOT_VERIFY_CODE_URL") or f"{FUNCTIONS_BASE_URL}/bot-verify-code"
        payload = {
            "action": "verify",
            "code": code.upper().strip(),
            "discordUserId": discord_user_id
        }
        # CRITICAL: Use exact same JSON serialization as backend expects
        # Must use separators=(",", ":") and ensure_ascii=False for signature to match
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        timestamp = str(int(time.time() * 1000))
        signature = hmac.new(
            WEBHOOK_SECRET.encode("utf-8"),
            f"{timestamp}.{payload_json}".encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
        }
        
        self.logger.request_start("bot-verify-code", "verify", discord_user_id)
        start = time.time()
        
        try:
            session = await self._get_session()
            async with session.post(
                verify_url,
                data=payload_json.encode("utf-8"),
                headers=headers,
            ) as resp:
                duration_ms = (time.time() - start) * 1000
                data = await resp.json()
                
                if resp.status == 200 and not data.get("error"):
                    self.logger.request_success("verify", duration_ms, json.dumps(data)[:100])
                else:
                    self.logger.request_error("verify", data.get("error", "Unknown"), resp.status)
                
                return data
        except Exception as e:
            self.logger.request_error("verify", str(e))
            return {"error": str(e)}
    
    async def unlink_account(self, discord_user_id: str) -> dict:
        """Unlink Discord account from UserVault."""
        return await self.reward_api("unlink_account", discord_user_id)
    
    async def get_profile(self, discord_user_id: str) -> dict:
        """Get UserVault profile for Discord user."""
        return await self.reward_api("get_profile", discord_user_id)
    
    async def lookup_profile(self, username: str) -> dict:
        """Look up any UserVault profile by username or UID (public info only)."""
        return await self.game_api("lookup_profile", username=username)

    async def delete_account(self, discord_user_id: str) -> dict:
        """Delete a user's linked UserVault account data."""
        return await self.reward_api("delete_account", discord_user_id)

    async def check_admin(self, discord_user_id: str) -> dict:
        """Check if a Discord user is a UserVault admin."""
        return await self.reward_api("check_admin", discord_user_id)

    async def get_bot_commands(self) -> dict:
        """Get all enabled bot commands from database."""
        return await self.game_api("get_bot_commands")
    
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
    
    async def play_plinko(self, risk: str = "medium", bet: int = 50) -> dict:
        """Play Plinko game."""
        return await self.game_api("play_plinko", risk=risk, bet=bet)
    
    async def play_keno(self, picks: list, bet: int = 50) -> dict:
        """Play Keno game."""
        return await self.game_api("play_keno", picks=picks, bet=bet)
    
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
    
    async def get_all_users(self, discord_user_id: str) -> dict:
        """Get all registered users (admin only)."""
        return await self.reward_api("get_all_users", discord_user_id)
    
    # ============ ADMIN METHODS ============
    
    async def admin_ban_user(self, admin_discord_id: str, target_username: str, reason: str) -> dict:
        """Ban a user (admin only)."""
        return await self.reward_api("admin_ban_user", admin_discord_id, target=target_username, reason=reason)
    
    async def admin_unban_user(self, admin_discord_id: str, target_username: str) -> dict:
        """Unban a user (admin only)."""
        return await self.reward_api("admin_unban_user", admin_discord_id, target=target_username)
    
    async def admin_adjust_balance(self, admin_discord_id: str, target_username: str, amount: int) -> dict:
        """Adjust a user's balance by amount (admin only). Negative = take, positive = give."""
        return await self.reward_api("admin_adjust_balance", admin_discord_id, target=target_username, amount=amount)
    
    async def admin_set_balance(self, admin_discord_id: str, target_username: str, amount: int) -> dict:
        """Set a user's balance to exact amount (admin only)."""
        return await self.reward_api("admin_set_balance", admin_discord_id, target=target_username, amount=amount)
    
    async def get_bot_stats(self, admin_discord_id: str) -> dict:
        """Get bot statistics (admin only)."""
        return await self.reward_api("get_bot_stats", admin_discord_id)
    
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


def _ensure_uservault_client_state(client: commands.Bot):
    """Ensure the running discord.py client has the attributes our commands rely on."""
    if not hasattr(client, "api"):
        client.api = UserVaultAPI(WEBHOOK_SECRET)
    if not hasattr(client, "active_guess_games"):
        client.active_guess_games = {}
    return client


async def fetch_commands_from_api(api: UserVaultAPI, force: bool = False) -> Dict[str, Any]:
    """
    Fetch all commands from the API and cache them.
    
    This is the CENTRAL function for loading commands dynamically.
    Commands are cached for _COMMANDS_CACHE_TTL seconds to avoid excessive API calls.
    Use force=True to bypass the cache (e.g., after ?refresh).
    """
    global _CACHED_BOT_COMMANDS, _COMMANDS_LAST_FETCHED
    
    now = time.time()
    
    # Return cached commands if still valid
    if not force and _CACHED_BOT_COMMANDS and (now - _COMMANDS_LAST_FETCHED) < _COMMANDS_CACHE_TTL:
        return _CACHED_BOT_COMMANDS
    
    try:
        result = await api.get_bot_commands()
        if result.get("error"):
            print(f"⚠️ [UserVault] Error fetching commands from API: {result.get('error')}")
            # Return cached commands on error
            return _CACHED_BOT_COMMANDS or {"commands": []}
        
        commands_list = result.get("commands", [])
        
        # Build a dict keyed by command name for fast lookup
        commands_by_name: Dict[str, Any] = {}
        for cmd in commands_list:
            name = cmd.get("name", "").lower()
            if name:
                commands_by_name[name] = cmd
        
        _CACHED_BOT_COMMANDS = {
            "commands": commands_list,
            "by_name": commands_by_name,
            "fetched_at": now,
        }
        _COMMANDS_LAST_FETCHED = now
        
        print(f"✅ [UserVault] Loaded {len(commands_list)} commands from API")
        return _CACHED_BOT_COMMANDS
        
    except Exception as e:
        print(f"❌ [UserVault] Failed to fetch commands from API: {e}")
        return _CACHED_BOT_COMMANDS or {"commands": []}


def get_cached_commands() -> List[Dict[str, Any]]:
    """Get the cached command list (synchronous access)."""
    return _CACHED_BOT_COMMANDS.get("commands", [])


def get_command_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Get a specific command by name from cache."""
    by_name = _CACHED_BOT_COMMANDS.get("by_name", {})
    return by_name.get(name.lower())


def is_command_registered(name: str) -> bool:
    """Check if a command is registered in the database."""
    return get_command_by_name(name) is not None


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


class MinesButton(discord.ui.Button):
    """Single cell button for Minesweeper."""
    
    def __init__(self, x: int, y: int, is_mine: bool, view: "MinesView"):
        super().__init__(
            style=discord.ButtonStyle.secondary,
            label="•",
            row=y
        )
        self.x = x
        self.y = y
        self.is_mine = is_mine
        self.mines_view = view
        self.revealed = False
    
    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.mines_view.user_id:
            await interaction.response.send_message("❌ Das ist nicht dein Spiel!", ephemeral=True)
            return
        
        # Prevent double-click race conditions
        if self.mines_view.game_over or self.mines_view.processing:
            await interaction.response.defer()
            return
        
        if self.revealed:
            await interaction.response.send_message("❌ Dieses Feld ist bereits aufgedeckt!", ephemeral=True)
            return
        
        # Set processing lock
        self.mines_view.processing = True
        
        self.revealed = True
        self.disabled = True
        
        if self.is_mine:
            # BOOM! Game over
            self.style = discord.ButtonStyle.danger
            self.label = "💣"
            self.mines_view.game_over = True
            self.mines_view.won = False
            
            # Reveal all mines
            for item in self.mines_view.children:
                if isinstance(item, MinesButton):
                    item.disabled = True
                    if item.is_mine:
                        item.style = discord.ButtonStyle.danger
                        item.label = "💣"
            
            embed = self.mines_view.create_embed(game_over=True, won=False)
            await interaction.response.edit_message(embed=embed, view=self.mines_view)
            self.mines_view.stop()
        else:
            # Safe! Increase multiplier
            self.style = discord.ButtonStyle.success
            self.label = "✓"
            self.mines_view.revealed_count += 1
            self.mines_view.update_multiplier()
            
            # Check if all safe cells revealed
            total_safe = 25 - self.mines_view.mine_count
            if self.mines_view.revealed_count >= total_safe:
                self.mines_view.game_over = True
                self.mines_view.won = True
                # Disable all buttons
                for item in self.mines_view.children:
                    if isinstance(item, MinesButton):
                        item.disabled = True
                embed = self.mines_view.create_embed(game_over=True, won=True)
                await interaction.response.edit_message(embed=embed, view=self.mines_view)
                
                # Award winnings
                winnings = int(self.mines_view.bet * self.mines_view.multiplier)
                await self.mines_view.bot.api.send_reward(
                    str(interaction.user.id),
                    winnings,
                    "mines",
                    f"Minesweeper win x{self.mines_view.multiplier:.2f}"
                )
                self.mines_view.stop()
            else:
                embed = self.mines_view.create_embed()
                await interaction.response.edit_message(embed=embed, view=self.mines_view)
                # Release lock for next click
                self.mines_view.processing = False


class MinesCashoutButton(discord.ui.Button):
    """Cashout button for Minesweeper."""
    
    def __init__(self, view: "MinesView"):
        super().__init__(
            style=discord.ButtonStyle.success,
            label="💰 Cashout",
            row=4
        )
        self.mines_view = view
    
    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.mines_view.user_id:
            await interaction.response.send_message("❌ Das ist nicht dein Spiel!", ephemeral=True)
            return
        
        # Prevent double-click race conditions
        if self.mines_view.game_over or self.mines_view.processing:
            await interaction.response.defer()
            return
        
        if self.mines_view.revealed_count == 0:
            await interaction.response.send_message("❌ Du musst mindestens ein Feld aufdecken!", ephemeral=True)
            return
        
        # Set processing lock
        self.mines_view.processing = True
        
        self.mines_view.game_over = True
        self.mines_view.won = True
        self.mines_view.cashed_out = True
        
        # Reveal all mines and disable
        for item in self.mines_view.children:
            if isinstance(item, MinesButton):
                item.disabled = True
                if item.is_mine and not item.revealed:
                    item.label = "💣"
                    item.style = discord.ButtonStyle.secondary
        
        # Calculate winnings
        winnings = int(self.mines_view.bet * self.mines_view.multiplier)
        
        embed = self.mines_view.create_embed(game_over=True, won=True, cashed_out=True)
        await interaction.response.edit_message(embed=embed, view=self.mines_view)
        
        # Award winnings
        await self.mines_view.bot.api.send_reward(
            str(interaction.user.id),
            winnings,
            "mines",
            f"Minesweeper cashout x{self.mines_view.multiplier:.2f}"
        )
        self.mines_view.stop()


class MinesView(discord.ui.View):
    """View for Minesweeper game with 5x5 grid."""
    
    def __init__(self, bot, user_id: int, bet: int, mine_count: int = 5):
        super().__init__(timeout=300)  # 5 minute timeout
        self.bot = bot
        self.user_id = user_id
        self.bet = bet
        self.mine_count = mine_count
        self.revealed_count = 0
        self.multiplier = 1.0
        self.game_over = False
        self.won = False
        self.cashed_out = False
        self.processing = False  # Lock to prevent double-click race conditions
        
        # Generate mine positions (5x5 grid = 25 cells)
        all_positions = [(x, y) for x in range(5) for y in range(4)]  # Only 4 rows for buttons (row 4 = cashout)
        self.mine_positions = set(random.sample(all_positions, mine_count))
        
        # Create grid buttons (4 rows of 5)
        for y in range(4):
            for x in range(5):
                is_mine = (x, y) in self.mine_positions
                btn = MinesButton(x, y, is_mine, self)
                self.add_item(btn)
        
        # Add cashout button
        self.add_item(MinesCashoutButton(self))
    
    def update_multiplier(self):
        """Calculate multiplier based on revealed safe cells."""
        safe_cells = 20 - self.mine_count  # 20 grid cells (4 rows * 5 cols)
        revealed = self.revealed_count
        
        if revealed == 0:
            self.multiplier = 1.0
            return
        
        # Progressive multiplier formula
        # Each reveal increases risk, so multiplier grows exponentially
        base_multi = 1.0
        for i in range(revealed):
            remaining_safe = safe_cells - i
            remaining_total = 20 - i
            if remaining_total > 0 and remaining_safe > 0:
                risk_factor = remaining_total / remaining_safe
                base_multi *= risk_factor
        
        self.multiplier = round(base_multi, 2)
    
    def create_embed(self, game_over: bool = False, won: bool = False, cashed_out: bool = False) -> discord.Embed:
        """Create the game embed."""
        if game_over:
            if won:
                winnings = int(self.bet * self.multiplier)
                if cashed_out:
                    title = "💰 Ausgezahlt!"
                    description = f"Du hast **{winnings} UC** gewonnen!"
                    color = discord.Color.gold()
                else:
                    title = "🎉 Alle sicheren Felder gefunden!"
                    description = f"Du hast **{winnings} UC** gewonnen!"
                    color = discord.Color.green()
            else:
                title = "💥 BOOM!"
                description = f"Du hast eine Mine getroffen! **-{self.bet} UC**"
                color = discord.Color.red()
        else:
            title = "💣 Minesweeper"
            potential = int(self.bet * self.multiplier)
            description = (
                f"**Einsatz:** {self.bet} UC\n"
                f"**Minen:** {self.mine_count}\n"
                f"**Aufgedeckt:** {self.revealed_count}/15\n"
                f"**Multiplikator:** x{self.multiplier:.2f}\n"
                f"**Potenzieller Gewinn:** {potential} UC"
            )
            color = discord.Color.blurple()
        
        embed = discord.Embed(title=title, description=description, color=color)
        embed.set_footer(text="Decke Felder auf ohne eine Mine zu treffen!")
        return embed


# ============ HIGHER OR LOWER GAME ============

CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
CARD_SUITS = ['♠️', '♥️', '♦️', '♣️']

def get_card_value(card: str) -> int:
    """Get numeric value of a card (2-14)."""
    value = card.split()[0]  # "10 ♥️" -> "10"
    if value == 'A':
        return 14
    elif value == 'K':
        return 13
    elif value == 'Q':
        return 12
    elif value == 'J':
        return 11
    else:
        return int(value)

def draw_random_card() -> str:
    """Draw a random card."""
    value = random.choice(CARD_VALUES)
    suit = random.choice(CARD_SUITS)
    return f"{value} {suit}"

def card_display(card: str) -> str:
    """Display card with emoji."""
    return f"🃏 **{card}**"


class HigherLowerButton(discord.ui.Button):
    """Button for Higher or Lower choice."""
    
    def __init__(self, choice: str, hl_view: "HigherLowerView"):
        emoji = "⬆️" if choice == "higher" else "⬇️"
        label = "Higher" if choice == "higher" else "Lower"
        super().__init__(style=discord.ButtonStyle.primary, emoji=emoji, label=label, row=0)
        self.choice = choice
        self.hl_view = hl_view
    
    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.hl_view.user_id:
            await interaction.response.send_message("❌ Das ist nicht dein Spiel!", ephemeral=True)
            return
        
        if self.hl_view.game_over:
            return
        
        # Draw next card
        next_card = draw_random_card()
        current_value = get_card_value(self.hl_view.current_card)
        next_value = get_card_value(next_card)
        
        # Determine if guess was correct
        if next_value == current_value:
            # Tie counts as win
            correct = True
        elif self.choice == "higher":
            correct = next_value > current_value
        else:
            correct = next_value < current_value
        
        self.hl_view.history.append(self.hl_view.current_card)
        self.hl_view.current_card = next_card
        
        if correct:
            self.hl_view.streak += 1
            self.hl_view.update_multiplier()
            embed = self.hl_view.create_embed()
            await interaction.response.edit_message(embed=embed, view=self.hl_view)
        else:
            # Game over - lost
            self.hl_view.game_over = True
            self.hl_view.won = False
            
            # Disable all buttons
            for item in self.hl_view.children:
                item.disabled = True
            
            # Deduct bet
            await self.hl_view.bot.api.send_reward(
                str(interaction.user.id),
                -self.hl_view.bet,
                "higherlower",
                f"Higher/Lower loss"
            )
            
            embed = self.hl_view.create_embed(reveal_card=next_card)
            await interaction.response.edit_message(embed=embed, view=self.hl_view)
            self.hl_view.stop()


class HigherLowerCashoutButton(discord.ui.Button):
    """Cashout button for Higher or Lower."""
    
    def __init__(self, hl_view: "HigherLowerView"):
        super().__init__(
            style=discord.ButtonStyle.success,
            label="💰 Cashout",
            row=1
        )
        self.hl_view = hl_view
    
    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.hl_view.user_id:
            await interaction.response.send_message("❌ Das ist nicht dein Spiel!", ephemeral=True)
            return
        
        if self.hl_view.game_over:
            return
        
        if self.hl_view.streak == 0:
            await interaction.response.send_message("❌ Du musst mindestens eine richtige Wahl treffen!", ephemeral=True)
            return
        
        self.hl_view.game_over = True
        self.hl_view.won = True
        self.hl_view.cashed_out = True
        
        # Disable all buttons
        for item in self.hl_view.children:
            item.disabled = True
        
        # Calculate winnings
        winnings = int(self.hl_view.bet * self.hl_view.multiplier)
        
        embed = self.hl_view.create_embed()
        await interaction.response.edit_message(embed=embed, view=self.hl_view)
        
        # Award winnings (net profit = winnings - bet)
        net_profit = winnings - self.hl_view.bet
        if net_profit > 0:
            await self.hl_view.bot.api.send_reward(
                str(interaction.user.id),
                net_profit,
                "higherlower",
                f"Higher/Lower cashout x{self.hl_view.multiplier:.2f}"
            )
        
        self.hl_view.stop()


class HigherLowerView(discord.ui.View):
    """View for Higher or Lower game."""
    
    def __init__(self, bot, user_id: int, bet: int):
        super().__init__(timeout=300)  # 5 minute timeout
        self.bot = bot
        self.user_id = user_id
        self.bet = bet
        self.current_card = draw_random_card()
        self.history: List[str] = []
        self.streak = 0
        self.multiplier = 1.0
        self.game_over = False
        self.won = False
        self.cashed_out = False
        
        # Add buttons
        self.add_item(HigherLowerButton("higher", self))
        self.add_item(HigherLowerButton("lower", self))
        self.add_item(HigherLowerCashoutButton(self))
    
    def update_multiplier(self):
        """Calculate multiplier based on streak."""
        # Each correct guess multiplies by ~1.5
        self.multiplier = round(1.0 + (self.streak * 0.5), 2)
    
    def create_embed(self, reveal_card: str = None) -> discord.Embed:
        """Create the game embed."""
        if self.game_over:
            if self.won:
                winnings = int(self.bet * self.multiplier)
                title = "💰 Ausgezahlt!"
                description = f"Du hast **{winnings} UC** gewonnen!\n\n**Streak:** {self.streak} richtige"
                color = discord.Color.gold()
            else:
                title = "❌ Falsch geraten!"
                prev_card = self.history[-1] if self.history else "?"
                description = (
                    f"Die Karte war {card_display(reveal_card)}\n"
                    f"Vorherige Karte: {card_display(prev_card)}\n\n"
                    f"**-{self.bet} UC**"
                )
                color = discord.Color.red()
        else:
            title = "🃏 Higher or Lower"
            potential = int(self.bet * self.multiplier)
            
            history_display = ""
            if self.history:
                history_cards = " → ".join(self.history[-5:])  # Show last 5 cards
                history_display = f"\n**Historie:** {history_cards}"
            
            description = (
                f"**Aktuelle Karte:** {card_display(self.current_card)}\n\n"
                f"Wird die nächste Karte **höher** oder **niedriger**?{history_display}\n\n"
                f"**Einsatz:** {self.bet} UC\n"
                f"**Streak:** {self.streak}\n"
                f"**Multiplikator:** x{self.multiplier:.2f}\n"
                f"**Potenzieller Gewinn:** {potential} UC"
            )
            color = discord.Color.blurple()
        
        embed = discord.Embed(title=title, description=description, color=color)
        embed.set_footer(text="Rate ob die nächste Karte höher oder niedriger ist!")
        return embed


# ============ CRASH GAME ============

class CrashButton(discord.ui.Button):
    """Button to cash out in Crash game."""
    
    def __init__(self, crash_view: "CrashView"):
        super().__init__(style=discord.ButtonStyle.success, label="💰 CASH OUT", row=0)
        self.crash_view = crash_view
    
    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.crash_view.user_id:
            await interaction.response.send_message("❌ Das ist nicht dein Spiel!", ephemeral=True)
            return
        
        if self.crash_view.game_over or self.crash_view.cashed_out:
            await interaction.response.defer()
            return
        
        # Cash out!
        self.crash_view.cashed_out = True
        self.crash_view.game_over = True
        self.crash_view.won = True
        self.crash_view.cashout_multiplier = self.crash_view.current_multiplier
        
        # Disable button
        self.disabled = True
        
        winnings = int(self.crash_view.bet * self.crash_view.cashout_multiplier)
        
        embed = self.crash_view.create_embed(game_over=True)
        await interaction.response.edit_message(embed=embed, view=self.crash_view)
        
        # Award winnings
        await self.crash_view.bot.api.send_reward(
            str(interaction.user.id),
            winnings,
            "crash",
            f"Crash cashout x{self.crash_view.cashout_multiplier:.2f}"
        )
        self.crash_view.stop()


class CrashView(discord.ui.View):
    """View for Crash game - multiplier rises until it crashes."""
    
    def __init__(self, bot, user_id: int, bet: int, message=None):
        super().__init__(timeout=60)  # 1 minute max game time
        self.bot = bot
        self.user_id = user_id
        self.bet = bet
        self.message = message
        self.current_multiplier = 1.00
        self.crash_point = self._generate_crash_point()
        self.game_over = False
        self.won = False
        self.cashed_out = False
        self.cashout_multiplier = 1.00
        self.tick_count = 0
        
        self.add_item(CrashButton(self))
    
    def _generate_crash_point(self) -> float:
        """Generate crash point using provably fair algorithm.
        
        Uses exponential distribution - most crashes happen early,
        but occasionally goes very high.
        """
        # Random float 0-1, with crash formula
        r = random.random()
        # Minimum crash at 1.00x, exponential growth
        # Formula: 0.99 / (1 - r) gives nice distribution
        # Cap at 100x max
        if r >= 0.99:
            return 100.0
        crash = 0.99 / (1 - r)
        return min(round(crash, 2), 100.0)
    
    async def start_game(self, channel):
        """Start the crash game animation."""
        embed = self.create_embed()
        self.message = await channel.send(embed=embed, view=self)
        
        # Deduct bet immediately
        await self.bot.api.send_reward(
            str(self.user_id),
            -self.bet,
            "crash",
            "Crash game bet"
        )
        
        # Start multiplier climbing
        await self.run_game()
    
    async def run_game(self):
        """Run the game loop - multiplier increases until crash or cashout."""
        while not self.game_over:
            await asyncio.sleep(0.8)  # Tick every 0.8 seconds
            
            if self.game_over or self.cashed_out:
                break
            
            # Increase multiplier
            self.tick_count += 1
            # Accelerating growth
            growth = 0.05 + (self.tick_count * 0.02)
            self.current_multiplier += growth
            self.current_multiplier = round(self.current_multiplier, 2)
            
            # Check if crashed
            if self.current_multiplier >= self.crash_point:
                self.game_over = True
                self.won = False
                self.current_multiplier = self.crash_point
                
                # Disable button
                for item in self.children:
                    item.disabled = True
                
                embed = self.create_embed(game_over=True)
                try:
                    await self.message.edit(embed=embed, view=self)
                except:
                    pass
                self.stop()
                return
            
            # Update display
            embed = self.create_embed()
            try:
                await self.message.edit(embed=embed, view=self)
            except:
                pass
    
    def create_embed(self, game_over: bool = False) -> discord.Embed:
        """Create the game embed."""
        if game_over:
            if self.won:
                winnings = int(self.bet * self.cashout_multiplier)
                title = "💰 CASHED OUT!"
                description = (
                    f"Du hast bei **x{self.cashout_multiplier:.2f}** ausgezahlt!\n\n"
                    f"💵 **Gewinn: {winnings} UC**\n"
                    f"📈 Crash war bei: x{self.crash_point:.2f}"
                )
                color = discord.Color.gold()
            else:
                title = "💥 CRASHED!"
                description = (
                    f"Der Multiplikator ist bei **x{self.crash_point:.2f}** gecrasht!\n\n"
                    f"💸 **Verlust: {self.bet} UC**"
                )
                color = discord.Color.red()
        else:
            title = "🚀 CRASH"
            # Create visual multiplier bar
            bar_length = min(int(self.current_multiplier * 2), 20)
            bar = "█" * bar_length + "░" * (20 - bar_length)
            
            potential = int(self.bet * self.current_multiplier)
            description = (
                f"```\n{bar}\n```\n"
                f"# x{self.current_multiplier:.2f}\n\n"
                f"**Einsatz:** {self.bet} UC\n"
                f"**Potenzieller Gewinn:** {potential} UC\n\n"
                f"⚠️ Cash out bevor es crasht!"
            )
            color = discord.Color.green() if self.current_multiplier < 2 else discord.Color.orange()
            if self.current_multiplier >= 5:
                color = discord.Color.red()
        
        embed = discord.Embed(title=title, description=description, color=color)
        embed.set_footer(text=f"UserVault Crash • {BOT_CODE_VERSION}")
        return embed


class UserVaultBot(commands.Bot):
    """Main Discord bot class."""
    
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        # Prefix commands are optional, but requested by admins.
        # Note: when loaded as an extension, the host bot's prefix configuration is used.
        super().__init__(command_prefix=commands.when_mentioned_or("?"), intents=intents)
        
        self.api = UserVaultAPI(WEBHOOK_SECRET)
        self.active_guess_games: Dict[int, dict] = {}
        self.notification_task: Optional[asyncio.Task] = None
    
    async def setup_hook(self):
        """Called when the bot is ready to set up commands."""
        _ensure_uservault_client_state(self)

        # Prefix commands (standalone mode)
        if not hasattr(self, "_uservault_prefix_cog_loaded"):
            await self.add_cog(UserVaultPrefixCommands(self))
            self._uservault_prefix_cog_loaded = True
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
        
        if ENABLE_SLASH_COMMANDS:
            # Register all commands (slash)
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
            print("✅ Slash commands synced!")
        else:
            print("ℹ️ Slash commands disabled (prefix-only mode: ?) ")
    
    async def on_ready(self):
        print(f"🤖 Bot ready: {self.user}")
        print(f"🏷️ Bot code version: {BOT_CODE_VERSION}")
        print(f"📊 Connected to {len(self.guilds)} guilds")
        print(f"✅ Message Content Intent: {self.intents.message_content}")
        print(f"✅ Prefix Cog loaded: {hasattr(self, '_uservault_prefix_cog_loaded')}")
        print(f"📋 Registered cogs: {list(self.cogs.keys())}")
        print(f"🔧 Command prefix: {self.command_prefix}")
        
        # Start notification polling
        if self.notification_task is None or self.notification_task.done():
            self.notification_task = asyncio.create_task(self.poll_notifications())
            print("📡 Started command notification polling")
    
    async def poll_notifications(self):
        """Poll for command notifications and send to Discord."""
        await self.wait_until_ready()

        print(f"📡 Notification polling active (channel_id={COMMAND_UPDATES_CHANNEL_ID})")

        while not self.is_closed():
            try:
                # Resolve channel (retry-friendly: don't permanently exit if cache isn't ready)
                channel = self.get_channel(COMMAND_UPDATES_CHANNEL_ID)
                if channel is None:
                    try:
                        channel = await self.fetch_channel(COMMAND_UPDATES_CHANNEL_ID)
                    except Exception as e:
                        print(f"⚠️ Could not fetch channel {COMMAND_UPDATES_CHANNEL_ID}: {e}")
                        await asyncio.sleep(5)
                        continue

                if not hasattr(self, "_uv_notif_channel_logged"):
                    chan_name = getattr(channel, "name", "unknown")
                    print(f"📢 Sending command updates to #{chan_name} (id={channel.id})")
                    self._uv_notif_channel_logged = True

                result = await self.api.get_pending_notifications()

                notifications = result.get("notifications") or []
                needs_reload = False
                
                if notifications:
                    for notif in notifications:
                        sent_ok = await self.send_command_notification(channel, notif)
                        if sent_ok:
                            await self.api.mark_notification_processed(notif["id"])
                            # Trigger reload for new or updated commands
                            action = notif.get("action", "")
                            if action in ("created", "updated"):
                                needs_reload = True
                        else:
                            # Leave unprocessed so it can retry after the next poll
                            print(f"⚠️ Notification NOT marked processed (send failed): {notif.get('id')}")

                # Auto-reload after processing all notifications if any command was created/updated
                if needs_reload:
                    await self._trigger_auto_reload(channel)

            except Exception as e:
                print(f"❌ Notification poll error: {e}")

            # Poll every 5 seconds
            await asyncio.sleep(5)

    async def _trigger_auto_reload(self, channel):
        """Automatically reload the extension when new commands are deployed."""
        try:
            # Only works in extension mode
            if _RUNNING_AS_EXTENSION:
                ext_name = "bot"  # The extension module name
                
                # Try to find the actual extension name
                for ext in list(self.extensions.keys()):
                    if "bot" in ext.lower() or "uservault" in ext.lower():
                        ext_name = ext
                        break
                
                print(f"🔄 Auto-reloading extension '{ext_name}' due to command update...")
                
                # Cleanup before reload
                try:
                    if self.get_cog("UserVaultPrefixCommands") is not None:
                        await self.remove_cog("UserVaultPrefixCommands")
                except Exception as e:
                    print(f"⚠️ Could not remove cog before auto-reload: {e}")
                
                # Clear flags
                if hasattr(self, "_uservault_prefix_cog_loaded"):
                    del self._uservault_prefix_cog_loaded
                if hasattr(self, "_uservault_implemented_prefix_cmds"):
                    del self._uservault_implemented_prefix_cmds
                if hasattr(self, "_uv_notif_channel_logged"):
                    del self._uv_notif_channel_logged
                
                # Cancel this notification task (will restart after reload)
                if self.notification_task and not self.notification_task.done():
                    self.notification_task.cancel()
                
                await self.reload_extension(ext_name)
                
                try:
                    await channel.send(f"🔄 **Auto-Reload** abgeschlossen! Neue Commands sind jetzt verfügbar. (Version: `{BOT_CODE_VERSION}`)")
                except Exception:
                    pass
                
                print(f"✅ Auto-reload completed for {ext_name}")
                
            else:
                # Standalone mode - can't auto-reload, just notify
                print("⚠️ Auto-reload not available in standalone mode. Restart the bot to pick up new commands.")
                try:
                    await channel.send("⚠️ Neuer Command deployed! Bitte Bot manuell neustarten (`?restart`) um ihn zu aktivieren.")
                except Exception:
                    pass
                    
        except Exception as e:
            print(f"❌ Auto-reload failed: {e}")
            try:
                await channel.send(f"❌ Auto-Reload fehlgeschlagen: {e}. Bitte manuell `?reload` ausführen.")
            except Exception:
                pass

    async def send_command_notification(self, channel, notif: dict) -> bool:
        """Send a command notification embed to Discord channel AND webhook. Returns True if sent successfully."""
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

        usage = None
        # Prefer explicit usage if the backend included it in change payload
        if isinstance(changes, dict):
            usage = changes.get("usage")

        shown = usage or f"?{command_name}"
        embed = discord.Embed(
            title=f"{emojis.get(action, '📋')} Command {action.capitalize()}",
            description=f"**`{shown}`** was {action}",
            color=colors.get(action, 0x6366f1),
            timestamp=discord.utils.utcnow(),
        )

        embed.add_field(
            name="⏰ Timestamp",
            value=f"<t:{int(time.time())}:F>",
            inline=True,
        )

        if changes:
            try:
                changes_items = changes.items() if isinstance(changes, dict) else [("changes", str(changes))]
                changes_text = "\n".join([f"• **{k}**: {v}" for k, v in changes_items])
            except Exception:
                changes_text = str(changes)

            embed.add_field(
                name="📋 Changes",
                value=changes_text[:1024],
                inline=False,
            )

        embed.set_footer(text=f"UserVault Command System • {BOT_CODE_VERSION}")

        channel_sent = False
        webhook_sent = False

        # 1. Try sending to Discord channel
        try:
            await channel.send(embed=embed)
            print(f"📤 Sent notification to channel: {action} {shown}")
            channel_sent = True
        except Exception as e:
            print(f"⚠️ Failed to send to channel (trying webhook): {e}")

        # 2. Also send to webhook from admin_webhooks table
        try:
            webhook_url = await self._get_command_webhook_url()
            if webhook_url:
                webhook_embed = {
                    "title": f"{emojis.get(action, '📋')} Command {action.capitalize()}",
                    "description": f"**`{shown}`** was {action}",
                    "color": colors.get(action, 0x6366f1),
                    "fields": [],
                    "timestamp": discord.utils.utcnow().isoformat(),
                    "footer": {"text": f"UserVault Command System • {BOT_CODE_VERSION}"},
                }
                
                if changes:
                    try:
                        changes_items = changes.items() if isinstance(changes, dict) else [("changes", str(changes))]
                        for k, v in changes_items:
                            webhook_embed["fields"].append({
                                "name": k.replace("_", " ").title(),
                                "value": str(v)[:1024],
                                "inline": True,
                            })
                    except Exception:
                        pass

                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        webhook_url,
                        json={"embeds": [webhook_embed]},
                        headers={"Content-Type": "application/json"},
                    ) as resp:
                        if resp.status in (200, 204):
                            print(f"📤 Sent notification to webhook: {action} {shown}")
                            webhook_sent = True
                        else:
                            print(f"⚠️ Webhook failed: {resp.status}")
        except Exception as e:
            print(f"⚠️ Webhook error: {e}")

        # Consider success if either channel or webhook succeeded
        return channel_sent or webhook_sent

    async def _get_command_webhook_url(self) -> str | None:
        """Fetch the bot_commands webhook URL from admin_webhooks table."""
        try:
            payload = {"action": "get_webhook", "notification_type": "bot_commands"}
            payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
            signature, timestamp = self.api._generate_signature(payload_json)
            
            headers = {
                "Content-Type": "application/json",
                "x-webhook-signature": signature,
                "x-webhook-timestamp": timestamp,
            }
            
            # Call a simple API that returns the webhook URL
            # For now, hardcode fetching from env or use a cached value
            webhook_url = os.getenv("BOT_COMMANDS_WEBHOOK_URL")
            if webhook_url:
                return webhook_url
            
            # Fallback: Try to get from API (if we add that endpoint later)
            return None
        except Exception as e:
            print(f"⚠️ Could not get webhook URL: {e}")
            return None
    
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
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    trivia_data = await api.get_trivia()
    view = TriviaView(interaction.client, trivia_data, interaction.user.id)  # type: ignore[arg-type]
    
    content = (
        f"🎯 **Trivia**\n\n"
        f"{trivia_data.get('question', 'Loading...')}\n\n"
        f"*Category: {trivia_data.get('category', 'General')}*"
    )
    
    await interaction.followup.send(content, view=view)


@app_commands.command(name="slots", description="🎰 Spin the slot machine!")
async def slots(interaction: discord.Interaction):
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    result = await api.spin_slots()
    payout = result.get("payout", 0)
    display = result.get("display", "🎰 🎰 🎰")
    
    result_text = f"🎉 **WIN! +{payout} UC**" if payout > 0 else "❌ No match"
    
    await interaction.followup.send(f"🎰 **Slots**\n\n{display}\n\n{result_text}")
    
    if payout > 0:
        await api.send_reward(str(interaction.user.id), payout, "slots", "Slots win")


@app_commands.command(name="coin", description="🪙 Flip a coin - heads or tails?")
@app_commands.choices(choice=[
    app_commands.Choice(name="Heads", value="heads"),
    app_commands.Choice(name="Tails", value="tails"),
])
async def coin(interaction: discord.Interaction, choice: app_commands.Choice[str]):
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    result = await api.flip_coin()
    won = result.get("result") == choice.value
    emoji = result.get("emoji", "🪙")
    
    content = (
        f"🪙 **Coinflip**\n\n"
        f"{emoji} The coin landed on **{result.get('result', 'unknown')}**!\n\n"
    )
    
    if won:
        content += "🎉 **You won! +10 UC**"
        await api.send_reward(str(interaction.user.id), 10, "coinflip", "Coinflip win")
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
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    result = await api.play_rps(choice.value)
    
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
        await api.send_reward(str(interaction.user.id), reward, "rps", "RPS win")
    elif game_result == "lose":
        content += "❌ You lost!"
    else:
        content += "🤝 It's a tie!"
    
    await interaction.followup.send(content)


@app_commands.command(name="blackjack", description="🃏 Play 21 against the dealer!")
async def blackjack(interaction: discord.Interaction):
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    game_data = await api.start_blackjack(50)
    
    content = (
        f"🃏 **Blackjack** (Bet: 50 UC)\n\n"
        f"Your hand: {game_data.get('playerDisplay', '??')} ({game_data.get('playerValue', 0)})\n"
        f"Dealer: {game_data.get('dealerDisplay', '??')}"
    )
    
    if game_data.get("playerValue") == 21:
        content += "\n\n🎉 **BLACKJACK! +75 UC**"
        await api.send_reward(str(interaction.user.id), 75, "blackjack", "Blackjack!")
        await interaction.followup.send(content)
    else:
        view = BlackjackView(interaction.client, game_data, interaction.user.id)  # type: ignore[arg-type]
        await interaction.followup.send(content, view=view)


@app_commands.command(name="guess", description="🔢 Guess the number (1-100)!")
async def guess(interaction: discord.Interaction):
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    active_guess_games = interaction.client.active_guess_games  # type: ignore[attr-defined]
    await interaction.response.defer()

    result = await api.generate_number()
    active_guess_games[interaction.user.id] = {
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
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    result = await api.get_balance(str(interaction.user.id))
    
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
    _ensure_uservault_client_state(interaction.client)  # type: ignore[arg-type]
    api = interaction.client.api  # type: ignore[attr-defined]
    await interaction.response.defer()
    
    result = await api.claim_daily(str(interaction.user.id))
    
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


class UserVaultPrefixCommands(commands.Cog):
    """Prefix commands (e.g. ?trivia) for admins/servers that prefer text commands."""

    def __init__(self, client: commands.Bot):
        self.client = _ensure_uservault_client_state(client)

    async def cog_load(self):
        """Called when the cog is loaded. Fetch commands from API."""
        try:
            await fetch_commands_from_api(self.client.api, force=True)
            print("✅ [UserVault] Commands loaded from API on cog_load")
        except Exception as e:
            print(f"⚠️ [UserVault] Failed to load commands on cog_load: {e}")

    @commands.command(name="helping", aliases=["cmds"])
    async def help_command(self, ctx: commands.Context, command_name: str = None):
        """
        Show all available commands from the database.
        Usage: ?helping [command_name]
        """
        # Fetch fresh commands from API
        cmd_data = await fetch_commands_from_api(self.client.api)
        commands_list = cmd_data.get("commands", [])
        
        if command_name:
            # Show details for a specific command
            cmd = get_command_by_name(command_name)
            if not cmd:
                await ctx.send(f"❌ Command `{command_name}` not found. Use `?help` to see all commands.")
                return
            
            cmd_name = cmd.get('name', 'unknown')
            cmd_usage = cmd.get('usage', f'?{cmd_name}')
            embed = discord.Embed(
                title=f"📖 Command: {cmd_usage}",
                description=cmd.get("description", "No description available."),
                color=discord.Color.blurple()
            )
            embed.add_field(name="Category", value=cmd.get("category", "General"), inline=True)
            embed.add_field(name="Enabled", value="✅ Yes" if cmd.get("is_enabled") else "❌ No", inline=True)
            embed.set_footer(text=f"UserVault Bot • v:{BOT_CODE_VERSION}")
            await ctx.send(embed=embed)
            return
        
        # Group commands by category
        categories: Dict[str, List[Dict[str, Any]]] = {}
        for cmd in commands_list:
            if not cmd.get("is_enabled", True):
                continue
            cat = cmd.get("category", "General") or "General"
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(cmd)
        
        embed = discord.Embed(
            title="📋 Available Commands",
            description=f"Use `?help <command>` for details on a specific command.\n\n**Total:** {len(commands_list)} commands loaded from API",
            color=discord.Color.blurple()
        )
        
        for cat_name, cat_cmds in sorted(categories.items()):
            cmd_list = ", ".join([f"`{c.get('name', '?')}`" for c in cat_cmds[:15]])
            if len(cat_cmds) > 15:
                cmd_list += f" (+{len(cat_cmds) - 15} more)"
            embed.add_field(name=f"📁 {cat_name}", value=cmd_list or "No commands", inline=False)
        
        embed.set_footer(text=f"UserVault Bot • v:{BOT_CODE_VERSION} • ?refresh to reload commands")
        await ctx.send(embed=embed)

    @commands.command(name="refresh")
    async def refresh_commands(self, ctx: commands.Context):
        """
        Refresh commands from the API.
        Usage: ?refresh
        """
        msg = await ctx.send("🔄 Refreshing commands from API...")
        
        try:
            # Clear cache and force fetch
            global _CACHED_BOT_COMMANDS, _COMMANDS_LAST_FETCHED
            _CACHED_BOT_COMMANDS = {}
            _COMMANDS_LAST_FETCHED = 0
            
            cmd_data = await fetch_commands_from_api(self.client.api, force=True)
            commands_list = cmd_data.get("commands", [])
            
            await msg.edit(content=f"✅ Refreshed! Loaded **{len(commands_list)}** commands from API.\n(v: `{BOT_CODE_VERSION}`)")
        except Exception as e:
            await msg.edit(content=f"❌ Error refreshing commands: {e}")

    @commands.command(name="apistats")
    async def apistats_prefix(self, ctx: commands.Context):
        logger = request_logger
        total = logger.request_count
        success_rate = (logger.success_count / total * 100) if total > 0 else 0
        
        # Add command cache info
        cached_count = len(get_cached_commands())
        cache_age = int(time.time() - _COMMANDS_LAST_FETCHED) if _COMMANDS_LAST_FETCHED > 0 else -1
        
        await ctx.send(
            "📊 **API Request Statistics**\n\n"
            f"📡 Total Requests: **{total}**\n"
            f"✅ Successful: **{logger.success_count}**\n"
            f"❌ Errors: **{logger.error_count}**\n"
            f"📈 Success Rate: **{success_rate:.1f}%**\n\n"
            f"📋 **Command Cache:**\n"
            f"Commands loaded: **{cached_count}**\n"
            f"Cache age: **{cache_age}s** (TTL: {_COMMANDS_CACHE_TTL}s)"
        )

    @commands.command(name="version", aliases=["ver", "v"])
    async def version_command(self, ctx: commands.Context):
        """
        Show bot version and debug info.
        Usage: ?version
        """
        import sys
        
        cached_count = len(get_cached_commands())
        cache_age = int(time.time() - _COMMANDS_LAST_FETCHED) if _COMMANDS_LAST_FETCHED > 0 else -1
        
        embed = discord.Embed(
            title="🤖 UserVault Bot Info",
            color=discord.Color.blurple()
        )
        embed.add_field(name="Version", value=f"`{BOT_CODE_VERSION}`", inline=True)
        embed.add_field(name="PID", value=f"`{os.getpid()}`", inline=True)
        embed.add_field(name="Python", value=f"`{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}`", inline=True)
        embed.add_field(name="Commands Loaded", value=f"`{cached_count}`", inline=True)
        embed.add_field(name="Cache Age", value=f"`{cache_age}s`" if cache_age >= 0 else "`Not loaded`", inline=True)
        embed.add_field(name="Cache TTL", value=f"`{_COMMANDS_CACHE_TTL}s`", inline=True)
        embed.add_field(name="File", value=f"`{Path(__file__).name}`", inline=False)
        embed.set_footer(text="Use ?refresh to reload commands from API")
        
        await ctx.send(embed=embed)

    async def balance_prefix(self, ctx: commands.Context):
        result = await ctx.bot.api.get_balance(str(ctx.author.id))  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ Error: {result['error']}")
            return
        await ctx.send(
            "💰 **Your Balance**\n\n"
            f"Balance: **{result.get('balance', 0)} UC**\n"
            f"Total Earned: {result.get('totalEarned', 0)} UC"
        )

    @commands.command(name="daily")
    async def daily_prefix(self, ctx: commands.Context):
        result = await ctx.bot.api.claim_daily(str(ctx.author.id))  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
            return
        await ctx.send(
            "📅 **Daily Reward**\n\n"
            f"🎉 Claimed **{result.get('reward', 50)} UC**!\n"
            f"🔥 Streak: {result.get('streak', 1)} days\n"
            f"💰 New Balance: {result.get('newBalance', 0)} UC"
        )

    @commands.command(name="slots")
    async def slots_prefix(self, ctx: commands.Context, bet: int = 20):
        """Spin the slot machine. Usage: ?slots [bet]"""
        # Validate bet
        if bet < 10:
            await ctx.send("❌ Minimum bet is 10 UC!")
            return
        if bet > 500:
            await ctx.send("❌ Maximum bet is 500 UC!")
            return
        
        # Check balance first
        balance_result = await ctx.bot.api.get_balance(str(ctx.author.id))  # type: ignore[attr-defined]
        if balance_result.get("error"):
            await ctx.send(f"❌ {balance_result['error']}")
            return
        current_balance = safe_int_balance(balance_result.get("balance", 0))
        if current_balance < bet:
            await ctx.send(f"❌ Insufficient balance! You have {current_balance} UC, but need {bet} UC.")
            return
        
        result = await ctx.bot.api.spin_slots()  # type: ignore[attr-defined]
        payout = result.get("payout", 0)
        display = result.get("display", "🎰 🎰 🎰")
        
        # Calculate net result (payout already includes multiplier of bet in the API)
        # If payout > 0, win = payout (e.g. 50, 100, etc.) minus bet
        # If payout = 0, lose = bet
        if payout > 0:
            # Win - payout is the total winnings, so net profit = payout
            await ctx.bot.api.send_reward(str(ctx.author.id), payout, "slots", f"Slots win ({payout} UC)")  # type: ignore[attr-defined]
            result_text = f"🎉 **WIN! +{payout} UC**"
        else:
            # Lose - deduct bet
            await ctx.bot.api.send_reward(str(ctx.author.id), -bet, "slots", f"Slots loss ({bet} UC)")  # type: ignore[attr-defined]
            result_text = f"❌ No match! **-{bet} UC**"
        
        await ctx.send(f"🎰 **Slots** (Bet: {bet} UC)\n\n{display}\n\n{result_text}")

    @commands.command(name="coin")
    async def coin_prefix(self, ctx: commands.Context, choice: str, bet: int = 10):
        """Coinflip game with bet. Usage: ?coin heads [bet] or ?coin tails [bet]"""
        choice = choice.lower().strip()
        if choice not in {"heads", "tails"}:
            await ctx.send("❌ Usage: `?coin heads [bet]` oder `?coin tails [bet]`")
            return
        
        # Validate bet
        if bet < 10:
            await ctx.send("❌ Minimum bet is 10 UC!")
            return
        if bet > 500:
            await ctx.send("❌ Maximum bet is 500 UC!")
            return
        
        # Check balance first
        balance_result = await ctx.bot.api.get_balance(str(ctx.author.id))  # type: ignore[attr-defined]
        if balance_result.get("error"):
            await ctx.send(f"❌ {balance_result['error']}")
            return
        current_balance = safe_int_balance(balance_result.get("balance", 0))
        if current_balance < bet:
            await ctx.send(f"❌ Insufficient balance! You have {current_balance} UC, but need {bet} UC.")
            return
        
        result = await ctx.bot.api.flip_coin()  # type: ignore[attr-defined]
        won = result.get("result") == choice
        emoji = result.get("emoji", "🪙")
        content = (
            f"🪙 **Coinflip** (Bet: {bet} UC)\n\n"
            f"{emoji} The coin landed on **{result.get('result', 'unknown')}**!\n\n"
        )
        if won:
            content += f"🎉 **You won! +{bet} UC**"
            await ctx.bot.api.send_reward(str(ctx.author.id), bet, "coinflip", f"Coinflip win ({bet} UC)")  # type: ignore[attr-defined]
        else:
            content += f"❌ You lost! **-{bet} UC**"
            await ctx.bot.api.send_reward(str(ctx.author.id), -bet, "coinflip", f"Coinflip loss ({bet} UC)")  # type: ignore[attr-defined]
        await ctx.send(content)

    @commands.command(name="rps")
    async def rps_prefix(self, ctx: commands.Context, choice: str, bet: int = 15):
        """Rock Paper Scissors with bet. Usage: ?rps rock|paper|scissors [bet]"""
        choice = choice.lower().strip()
        if choice not in {"rock", "paper", "scissors"}:
            await ctx.send("❌ Usage: `?rps rock|paper|scissors [bet]`")
            return
        
        # Validate bet
        if bet < 10:
            await ctx.send("❌ Minimum bet is 10 UC!")
            return
        if bet > 500:
            await ctx.send("❌ Maximum bet is 500 UC!")
            return
        
        # Check balance first
        balance_result = await ctx.bot.api.get_balance(str(ctx.author.id))  # type: ignore[attr-defined]
        if balance_result.get("error"):
            await ctx.send(f"❌ {balance_result['error']}")
            return
        current_balance = safe_int_balance(balance_result.get("balance", 0))
        if current_balance < bet:
            await ctx.send(f"❌ Insufficient balance! You have {current_balance} UC, but need {bet} UC.")
            return
        
        result = await ctx.bot.api.play_rps(choice)  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ Error: {result['error']}")
            return
        game_result = result.get("result", "tie")
        player_emoji = result.get("playerEmoji", "❓")
        bot_emoji = result.get("botEmoji", "❓")
        content = f"✂️ **Rock Paper Scissors** (Bet: {bet} UC)\n\nYou: {player_emoji}  vs  Bot: {bot_emoji}\n\n"
        if game_result == "win":
            content += f"🎉 **You won! +{bet} UC**"
            await ctx.bot.api.send_reward(str(ctx.author.id), bet, "rps", f"RPS win ({bet} UC)")  # type: ignore[attr-defined]
        elif game_result == "lose":
            content += f"❌ You lost! **-{bet} UC**"
            await ctx.bot.api.send_reward(str(ctx.author.id), -bet, "rps", f"RPS loss ({bet} UC)")  # type: ignore[attr-defined]
        else:
            content += "🤝 It's a tie! No UC won or lost."
        await ctx.send(content)

    @commands.command(name="blackjack")
    async def blackjack_prefix(self, ctx: commands.Context):
        game_data = await ctx.bot.api.start_blackjack(50)  # type: ignore[attr-defined]
        content = (
            "🃏 **Blackjack** (Bet: 50 UC)\n\n"
            f"Your hand: {game_data.get('playerDisplay', '??')} ({game_data.get('playerValue', 0)})\n"
            f"Dealer: {game_data.get('dealerDisplay', '??')}"
        )
        if game_data.get("playerValue") == 21:
            content += "\n\n🎉 **BLACKJACK! +75 UC**"
            await ctx.bot.api.send_reward(str(ctx.author.id), 75, "blackjack", "Blackjack!")  # type: ignore[attr-defined]
            await ctx.send(content)
            return
        view = BlackjackView(ctx.bot, game_data, ctx.author.id)
        await ctx.send(content, view=view)

    @commands.command(name="guess")
    async def guess_prefix(self, ctx: commands.Context):
        result = await ctx.bot.api.generate_number()  # type: ignore[attr-defined]
        ctx.bot.active_guess_games[ctx.author.id] = {  # type: ignore[attr-defined]
            "secret": result.get("secret"),
            "attempts": 5,
            "channel_id": ctx.channel.id,
        }
        await ctx.send(
            "🔢 **Guess the Number**\n\n"
            "I'm thinking of a number between 1 and 100.\n"
            "You have 5 attempts!\n\n"
            "Type a number in chat to guess."
        )

    @commands.command(name="mines")
    async def mines_prefix(self, ctx: commands.Context, bet: int = 50):
        """Start a Minesweeper game."""
        if bet < 10:
            await ctx.send("❌ Minimum bet is 10 UC!")
            return
        if bet > 1000:
            await ctx.send("❌ Maximum bet is 1000 UC!")
            return
        
        # Check balance
        balance_result = await ctx.bot.api.get_balance(str(ctx.author.id))  # type: ignore[attr-defined]
        current_balance = safe_int_balance(balance_result.get("balance", 0))
        if current_balance < bet:
            await ctx.send(f"❌ Insufficient balance! You have {current_balance} UC.")
            return
        
        view = MinesView(ctx.bot, ctx.author.id, bet)
        embed = view.create_embed()
        await ctx.send(embed=embed, view=view)

    @commands.command(name="trivia")
    async def trivia_prefix(self, ctx: commands.Context):
        trivia_data = await ctx.bot.api.get_trivia()  # type: ignore[attr-defined]
        options = trivia_data.get("options", [])
        question = trivia_data.get("question", "Trivia")
        category = trivia_data.get("category", "General")
        if not options:
            await ctx.send("❌ Trivia konnte nicht geladen werden.")
            return

        options_text = "\n".join([f"{i+1}. {opt}" for i, opt in enumerate(options)])
        await ctx.send(
            "🎯 **Trivia**\n\n"
            f"{question}\n\n"
            f"*Category: {category}*\n\n"
            f"{options_text}\n\n"
            "Antworte mit der Zahl (1-4) innerhalb von 60s."
        )

        def check(m: discord.Message):
            return (
                m.author.id == ctx.author.id
                and m.channel.id == ctx.channel.id
                and m.content.strip().isdigit()
            )

        try:
            msg = await self.client.wait_for("message", check=check, timeout=60)
            idx = int(msg.content.strip()) - 1
            if idx < 0 or idx >= len(options):
                await ctx.send("❌ Ungültige Auswahl.")
                return
            selected_answer = options[idx]
            result = await ctx.bot.api.check_trivia(question, selected_answer)  # type: ignore[attr-defined]
            if result.get("correct"):
                reward = result.get("reward", 25)
                await ctx.bot.api.send_reward(str(ctx.author.id), reward, "trivia", "Trivia correct")  # type: ignore[attr-defined]
                await ctx.send(f"✅ **Correct!** +{reward} UC")
            else:
                await ctx.send(f"❌ Wrong! The answer was: **{result.get('correctAnswer', 'Unknown')}**")
        except asyncio.TimeoutError:
            await ctx.send("⏱️ Timeout – keine Antwort erhalten.")

    @commands.command(name="link")
    async def link_prefix(self, ctx: commands.Context, code: str = None):
        if not code:
            await ctx.send(
                "🔗 **Account Linking**\n\n"
                "1️⃣ Geh zu deinem UserVault Dashboard → Overview\n"
                "2️⃣ Klick auf 'Generate Verification Code'\n"
                "3️⃣ Nutze: `?link <CODE>`\n\n"
                "Beispiel: `?link ABC123`"
            )
            return
        result = await ctx.bot.api.link_account(str(ctx.author.id), code)  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
        elif result.get("success"):
            username = result.get("username", "your account")
            await ctx.send(f"🔗 **Account Linked!** ✅\n\nDein Discord ist jetzt mit **{username}** verlinkt! 💰")

    @commands.command(name="unlink")
    async def unlink_prefix(self, ctx: commands.Context):
        result = await ctx.bot.api.unlink_account(str(ctx.author.id))  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
        else:
            await ctx.send("🔓 **Account Unlinked**")

    @commands.command(name="delete")
    async def delete_prefix(self, ctx: commands.Context):
        """Delete your linked UserVault account data."""
        # Ask for confirmation first
        confirm_msg = await ctx.send(
            "⚠️ **Account Deletion**\n\n"
            "Dies wird **alle deine UserVault-Daten löschen**:\n"
            "• Balance & Transaktionen\n"
            "• Minigame-Statistiken\n"
            "• Discord-Verknüpfung\n\n"
            "Reagiere mit ✅ innerhalb von 30 Sekunden um zu bestätigen."
        )
        await confirm_msg.add_reaction("✅")
        await confirm_msg.add_reaction("❌")

        def check(reaction, user):
            return (
                user.id == ctx.author.id
                and reaction.message.id == confirm_msg.id
                and str(reaction.emoji) in ["✅", "❌"]
            )

        try:
            reaction, _ = await ctx.bot.wait_for("reaction_add", timeout=30.0, check=check)
            if str(reaction.emoji) == "❌":
                await ctx.send("❌ Account-Löschung abgebrochen.")
                return
        except asyncio.TimeoutError:
            await ctx.send("⏱️ Timeout – Account-Löschung abgebrochen.")
            return

        # Proceed with deletion
        result = await ctx.bot.api.delete_account(str(ctx.author.id))  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
        else:
            await ctx.send(
                "🗑️ **Account Gelöscht**\n\n"
                "Alle deine UserVault-Daten wurden entfernt.\n"
                "Du kannst jederzeit mit `?link <username>` einen neuen Account verknüpfen."
            )

    @commands.command(name="profile")
    async def profile_prefix(self, ctx: commands.Context):
        result = await ctx.bot.api.get_profile(str(ctx.author.id))  # type: ignore[attr-defined]
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
            return
        username = result.get("username", "Unknown")
        balance = result.get("balance", 0)
        total_earned = result.get("totalEarned", 0)
        profile_url = f"https://uservault.cc/{username}"
        await ctx.send(
            "👤 **UserVault Profile**\n\n"
            f"**Username:** {username}\n"
            f"💰 **Balance:** {balance} UC\n"
            f"📈 **Total Earned:** {total_earned} UC\n"
            f"🔗 **Profile:** {profile_url}"
        )

    @commands.command(name="lookup")
    async def lookup_prefix(self, ctx: commands.Context, username: str = None):
        """Look up any UserVault profile by username."""
        if not username:
            await ctx.send("❌ Usage: `?lookup <username>`")
            return
        
        # Clean up username
        username = username.strip().lower()
        
        # Call the API to get public profile info
        result = await ctx.bot.api.lookup_profile(username)  # type: ignore[attr-defined]
        
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
            return
        
        display_name = result.get("display_name") or result.get("username", username)
        bio = result.get("bio", "No bio set")
        views = result.get("views_count", 0)
        likes = result.get("likes_count", 0)
        is_premium = result.get("is_premium", False)
        profile_url = f"https://uservault.cc/{username}"
        
        premium_badge = "⭐ " if is_premium else ""
        
        embed = discord.Embed(
            title=f"{premium_badge}{display_name}",
            url=profile_url,
            description=bio[:200] if bio else "No bio set",
            color=discord.Color.blurple()
        )
        embed.add_field(name="👁️ Views", value=str(views), inline=True)
        embed.add_field(name="❤️ Likes", value=str(likes), inline=True)
        embed.set_footer(text=f"uservault.cc/{username}")
        
        await ctx.send(embed=embed)

    @commands.command(name="users")
    async def users_prefix(self, ctx: commands.Context):
        """Admin command to list all registered UserVault users."""
        # Check if user is admin
        admin_check = await ctx.bot.api.check_admin(str(ctx.author.id))  # type: ignore[attr-defined]
        if not admin_check.get("is_admin"):
            await ctx.send("❌ Admin access required!")
            return
        
        # Fetch all users
        result = await ctx.bot.api.get_all_users(str(ctx.author.id))  # type: ignore[attr-defined]
        
        if result.get("error"):
            await ctx.send(f"❌ {result['error']}")
            return
        
        users = result.get("users", [])
        count = result.get("count", 0)
        
        if not users:
            await ctx.send("📋 No registered users found.")
            return
        
        # Create paginated embeds (25 users per page)
        pages = []
        per_page = 25
        for i in range(0, len(users), per_page):
            page_users = users[i:i + per_page]
            embed = discord.Embed(
                title=f"📋 Registered Users ({count} total)",
                description="\n".join([
                    f"**#{u.get('uid_number', '?')}** — {u.get('username', 'Unknown')}"
                    for u in page_users
                ]),
                color=discord.Color.blurple()
            )
            page_num = (i // per_page) + 1
            total_pages = (len(users) + per_page - 1) // per_page
            embed.set_footer(text=f"Page {page_num}/{total_pages} • uservault.cc")
            pages.append(embed)
        
        # Send first page (could add pagination buttons later)
        await ctx.send(embed=pages[0])
        
        # If more pages, send a note
        if len(pages) > 1:
            await ctx.send(f"ℹ️ Showing first {per_page} of {count} users.")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return

        # DEBUG: Log all ? messages to verify the listener is active
        content = (message.content or "").strip()
        if content.startswith("?"):
            print(f"📥 [UserVault] Received command: {content[:50]} from {message.author}")

        # ===== Manual prefix handling (works even if host bot doesn't call process_commands) =====
        # Some host bots override on_message without calling bot.process_commands().
        # In that case, @commands.command prefix commands won't fire. We handle critical
        # prefix commands here so they still work in extension mode.
        lowered = content.lower()

        # ===== ?help / ?helping - List all commands =====
        if lowered in {"?help", "?helping", "?commands"}:
            try:
                result = await self.client.api.get_bot_commands()  # type: ignore[attr-defined]
            except Exception as e:
                await message.reply(f"❌ Failed to load commands: {e}")
                return
            
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
                return
            
            cmds = result.get("commands", [])
            if not cmds:
                await message.reply("📋 No commands available.")
                return
            
            # Group by category
            categories: Dict[str, List[dict]] = {}
            for cmd in cmds:
                cat = cmd.get("category") or "other"
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(cmd)
            
            embed = discord.Embed(
                title="📋 UserVault Bot Commands",
                description="All available prefix commands:",
                color=discord.Color.blurple(),
            )
            
            cat_emojis = {
                "games": "🎮",
                "utility": "🔧",
                "admin": "👮",
                "other": "📦",
            }
            
            for cat, cat_cmds in categories.items():
                emoji = cat_emojis.get(cat, "📦")
                lines = []
                for c in cat_cmds:
                    usage = c.get("usage") or f"?{c.get('name', '???')}"
                    desc = c.get("description") or ""
                    lines.append(f"`{usage}` – {desc[:50]}")
                embed.add_field(
                    name=f"{emoji} {cat.capitalize()}",
                    value="\n".join(lines) or "–",
                    inline=False,
                )
            
            embed.set_footer(text="uservault.cc")
            
            try:
                await message.reply(embed=embed)
            except discord.Forbidden:
                # Fallback to text
                text_lines = ["**📋 UserVault Bot Commands**\n"]
                for cat, cat_cmds in categories.items():
                    text_lines.append(f"**{cat.capitalize()}:**")
                    for c in cat_cmds:
                        usage = c.get("usage") or f"?{c.get('name', '???')}"
                        text_lines.append(f"  {usage}")
                await message.reply("\n".join(text_lines))
            return

        # ===== ?reload - Admin only extension reload =====
        if lowered == "?reload":
            # Check if user is bot owner, in env admin list, or a UserVault admin/supporter
            admin_ids_str = os.getenv("ADMIN_USER_IDS", "")
            admin_ids = {int(x.strip()) for x in admin_ids_str.split(",") if x.strip().isdigit()}
            
            app_info = getattr(self.client, "application", None)
            owner_id = getattr(app_info, "owner", None)
            owner_id = getattr(owner_id, "id", None) if owner_id else None
            
            is_authorized = message.author.id in admin_ids or message.author.id == owner_id
            
            # Also check UserVault admin or supporter role if not already authorized
            if not is_authorized:
                api = getattr(self.client, "api", None)
                if api:
                    try:
                        result = await api.check_admin(str(message.author.id))
                        if result.get("is_admin") or result.get("is_supporter"):
                            is_authorized = True
                        # Debug logging
                        print(f"🔍 [reload] Admin check for {message.author.id}: {result}")
                    except Exception as e:
                        print(f"⚠️ Could not check UserVault admin status: {e}")
            
            if not is_authorized:
                await message.reply("❌ Admin only command. You need to be a UserVault admin or supporter.")
                return
            
            try:
                # Attempt to reload the extension
                # Use the Cog's module name (more robust than __name__ in some reload contexts)
                ext_name = self.__class__.__module__
                if ext_name == "__main__":
                    await message.reply("⚠️ Cannot reload in standalone mode. Restart the bot instead.")
                    return

                # Proactively remove the cog/listeners to avoid duplicate handlers and to ensure
                # the new module instance can re-register cleanly.
                try:
                    if self.client.get_cog("UserVaultPrefixCommands") is not None:
                        self.client.remove_cog("UserVaultPrefixCommands")
                except Exception as e:
                    print(f"⚠️ [UserVault] Could not remove prefix cog before reload: {e}")
                
                # Clear the flag so the cog gets re-added on reload
                if hasattr(self.client, "_uservault_prefix_cog_loaded"):
                    del self.client._uservault_prefix_cog_loaded

                # Clear cached implemented command set so unknown-command detection stays accurate
                if hasattr(self.client, "_uservault_implemented_prefix_cmds"):
                    del self.client._uservault_implemented_prefix_cmds
                
                # Cancel notification task if running (will restart on reload)
                if hasattr(self.client, "_uservault_notification_task"):
                    task = self.client._uservault_notification_task
                    if task and not task.done():
                        task.cancel()
                    del self.client._uservault_notification_task
                
                await message.reply("🔄 Reloading extension...")
                await self.client.reload_extension(ext_name)
                # Send a confirmation after successful reload.
                # (This coroutine continues even though the module code was reloaded.)
                try:
                    await message.channel.send("✅ Reload complete. Commands should work immediately.")
                except Exception:
                    pass
            except Exception as e:
                await message.reply(f"❌ Reload failed: {e}")
            return

        # ===== ?restart - Admin only process restart (standalone only) =====
        if lowered == "?restart":
            # Same authorization logic as ?reload
            admin_ids_str = os.getenv("ADMIN_USER_IDS", "")
            admin_ids = {int(x.strip()) for x in admin_ids_str.split(",") if x.strip().isdigit()}

            app_info = getattr(self.client, "application", None)
            owner_id = getattr(app_info, "owner", None)
            owner_id = getattr(owner_id, "id", None) if owner_id else None

            is_authorized = message.author.id in admin_ids or message.author.id == owner_id

            if not is_authorized:
                api = getattr(self.client, "api", None)
                if api:
                    try:
                        result = await api.check_admin(str(message.author.id))
                        if result.get("is_admin") or result.get("is_supporter"):
                            is_authorized = True
                        print(f"🔍 [restart] Admin check for {message.author.id}: {result}")
                    except Exception as e:
                        print(f"⚠️ Could not check UserVault admin status: {e}")

            if not is_authorized:
                await message.reply("❌ Admin only command. You need to be a UserVault admin or supporter.")
                return

            # Never kill a host bot when loaded as extension
            if _RUNNING_AS_EXTENSION or self.__class__.__module__ != "__main__":
                await message.reply(
                    "⚠️ `?restart` ist im Extension-Modus deaktiviert (würde den Host-Bot killen). "
                    "Nutze `?reload` oder starte den Host-Prozess neu."
                )
                return

            await message.reply("🧨 Restarting bot process now…")
            try:
                await self.client.close()
            finally:
                # Restart the bot process by re-executing the script
                import sys
                python = sys.executable
                script = os.path.abspath(sys.argv[0])
                args = sys.argv[1:]
                print(f"🔄 Restarting: {python} {script} {' '.join(args)}")
                os.execv(python, [python, script] + args)

        # ===== ?ping - Simple connectivity test =====
        if lowered == "?ping":
            await message.reply("🏓 Pong! Bot is responding.")
            return

        # ===== ?version - Show bot version =====
        if lowered == "?version":
            embed = discord.Embed(
                title="🤖 Bot Version",
                description=f"**Version:** `{BOT_CODE_VERSION}`",
                color=0x5865F2,
            )

            embed.add_field(name="Mode", value="extension" if _RUNNING_AS_EXTENSION else "standalone", inline=True)
            embed.add_field(name="PID", value=str(os.getpid()), inline=True)
            embed.add_field(name="Module", value=f"`{self.__class__.__module__}`", inline=False)
            embed.add_field(name="Running file", value=f"`{os.path.abspath(__file__)}`", inline=False)
            embed.add_field(name="API Endpoint", value=f"`{FUNCTIONS_BASE_URL}`", inline=False)

            embed.set_footer(text=f"UserVault Bot • {BOT_CODE_VERSION}")
            await message.reply(embed=embed)
            return

        # ===== ?crash - Crash game =====
        if lowered.startswith("?crash"):
            parts = content.split()
            bet = 50  # Default bet
            if len(parts) > 1:
                try:
                    bet = int(parts[1])
                except ValueError:
                    await message.reply("❌ Ungültiger Einsatz! Nutze: `?crash <einsatz>`")
                    return
            
            if bet < 10:
                await message.reply("❌ Minimum Einsatz ist 10 UC!")
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Nicht genug Guthaben! Du hast {current_balance} UC.")
                return
            
            view = CrashView(self.client, message.author.id, bet)
            asyncio.create_task(view.start_game(message.channel))
            return

        # ===== ?mines - Minesweeper game =====
        if lowered.startswith("?mines"):
            parts = content.split()
            bet = 50  # Default bet
            if len(parts) > 1:
                try:
                    bet = int(parts[1])
                except ValueError:
                    await message.reply("❌ Ungültiger Einsatz! Nutze: `?mines <einsatz>`")
                    return
            
            if bet < 10:
                await message.reply("❌ Minimum Einsatz ist 10 UC!")
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Nicht genug Guthaben! Du hast {current_balance} UC.")
                return
            
            view = MinesView(self.client, message.author.id, bet)
            embed = view.create_embed()
            await message.reply(embed=embed, view=view)
            return

        # ===== ?higherlower / ?hl - Higher or Lower game =====
        if lowered.startswith("?higherlower") or lowered.startswith("?hl ") or lowered == "?hl":
            parts = content.split()
            bet = 50  # Default bet
            if len(parts) > 1:
                try:
                    bet = int(parts[1])
                except ValueError:
                    await message.reply("❌ Ungültiger Einsatz! Nutze: `?higherlower <einsatz>` oder `?hl <einsatz>`")
                    return
            
            if bet < 10:
                await message.reply("❌ Minimum Einsatz ist 10 UC!")
                return
            
            # Check balance (no max limit - only balance dependent)
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Nicht genug Guthaben! Du hast {current_balance} UC.")
                return
            
            view = HigherLowerView(self.client, message.author.id, bet)
            embed = view.create_embed()
            await message.reply(embed=embed, view=view)
            return

        # ===== ?roulette - Roulette game =====
        if lowered.startswith("?roulette"):
            parts = content.split()
            
            # Usage: ?roulette <bet> <wette>
            # Wetten: red, black, odd, even, 0-36
            if len(parts) < 3:
                await message.reply(
                    "🎰 **Roulette Usage:**\n"
                    "`?roulette <einsatz> <wette>`\n\n"
                    "**Wetten:**\n"
                    "• `red` / `black` - Farbe (2x)\n"
                    "• `odd` / `even` - Ungerade/Gerade (2x)\n"
                    "• `0-36` - Einzelne Zahl (36x)\n\n"
                    "Beispiel: `?roulette 100 red`"
                )
                return
            
            try:
                bet = int(parts[1])
            except ValueError:
                await message.reply("❌ Ungültiger Einsatz!")
                return
            
            if bet < 10:
                await message.reply("❌ Minimum Einsatz ist 10 UC!")
                return
            
            wette = parts[2].lower()
            
            # Validate bet type
            valid_colors = {"red", "rot", "black", "schwarz"}
            valid_parity = {"odd", "ungerade", "even", "gerade"}
            valid_number = set(str(i) for i in range(37))
            
            bet_type = None
            bet_value = None
            
            if wette in valid_colors:
                bet_type = "color"
                bet_value = "red" if wette in {"red", "rot"} else "black"
            elif wette in valid_parity:
                bet_type = "parity"
                bet_value = "odd" if wette in {"odd", "ungerade"} else "even"
            elif wette in valid_number:
                bet_type = "number"
                bet_value = int(wette)
            else:
                await message.reply(
                    "❌ Ungültige Wette! Erlaubt: `red`, `black`, `odd`, `even`, `0-36`"
                )
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Nicht genug Guthaben! Du hast {current_balance} UC.")
                return
            
            # Roulette numbers and colors
            red_numbers = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
            
            # Spin the wheel
            import random
            result_num = random.randint(0, 36)
            result_color = "green" if result_num == 0 else ("red" if result_num in red_numbers else "black")
            result_parity = None if result_num == 0 else ("odd" if result_num % 2 == 1 else "even")
            
            # Color emojis
            color_emoji = {"red": "🔴", "black": "⚫", "green": "🟢"}
            
            # Check win
            won = False
            multiplier = 0
            
            if bet_type == "color":
                won = (bet_value == result_color)
                multiplier = 2
            elif bet_type == "parity":
                won = (result_num != 0 and bet_value == result_parity)
                multiplier = 2
            elif bet_type == "number":
                won = (bet_value == result_num)
                multiplier = 36
            
            # Calculate winnings
            if won:
                winnings = bet * multiplier
                # Add winnings (net profit)
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id),
                    winnings - bet,  # Net profit
                    "roulette",
                    f"Roulette win ({bet_type}: {bet_value})"
                )
                result_text = f"🎉 **GEWONNEN!** +{winnings} UC (x{multiplier})"
            else:
                # Deduct bet
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id),
                    -bet,
                    "roulette",
                    f"Roulette loss ({bet_type}: {bet_value})"
                )
                result_text = f"❌ **Verloren!** -{bet} UC"
            
            # Build response embed
            embed = discord.Embed(
                title="🎰 Roulette",
                color=discord.Color.green() if won else discord.Color.red()
            )
            embed.add_field(
                name="Ergebnis",
                value=f"{color_emoji[result_color]} **{result_num}** ({result_color.upper()})",
                inline=True
            )
            embed.add_field(
                name="Deine Wette",
                value=f"{bet} UC auf **{bet_value}**",
                inline=True
            )
            embed.add_field(
                name="Resultat",
                value=result_text,
                inline=False
            )
            embed.set_footer(text="Viel Glück beim nächsten Spin!")
            
            await message.reply(embed=embed)
            return

        # ── ?dice ── Dice Duel game
        if lowered.startswith("?dice"):
            parts = content.split()
            if len(parts) < 2:
                await message.reply(
                    "🎲 **Dice Duel**\n"
                    "Roll dice against the bot - highest roll wins!\n\n"
                    "Usage: `?dice <bet>`\n"
                    "Example: `?dice 100`\n\n"
                    "• Win: **2x** your bet\n"
                    "• Tie: Bet returned"
                )
                return
            
            bet_str = parts[1].replace(",", "")
            if not bet_str.isdigit() or int(bet_str) < 10:
                await message.reply("❌ Minimum bet is 10 UC!")
                return
            
            bet = int(bet_str)
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Not enough UC! You have **{current_balance:,} UC**.")
                return
            
            # Roll dice (2d6 each)
            import random
            player_d1 = random.randint(1, 6)
            player_d2 = random.randint(1, 6)
            bot_d1 = random.randint(1, 6)
            bot_d2 = random.randint(1, 6)
            
            player_total = player_d1 + player_d2
            bot_total = bot_d1 + bot_d2
            
            # Dice emojis
            dice_emoji = {1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅"}
            
            player_display = f"{dice_emoji[player_d1]} {dice_emoji[player_d2]} = **{player_total}**"
            bot_display = f"{dice_emoji[bot_d1]} {dice_emoji[bot_d2]} = **{bot_total}**"
            
            # Determine winner
            if player_total > bot_total:
                result_text = f"🎉 **YOU WIN!** +{bet:,} UC"
                color = discord.Color.green()
                # Award winnings (net profit = bet)
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), bet, "dice", "Dice Duel win"
                )
            elif player_total < bot_total:
                result_text = f"💀 **Bot wins!** -{bet:,} UC"
                color = discord.Color.red()
                # Deduct bet
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), -bet, "dice", "Dice Duel loss"
                )
            else:
                result_text = "🤝 **It's a tie!** Bet returned."
                color = discord.Color.gold()
            
            embed = discord.Embed(title="🎲 Dice Duel", color=color)
            embed.add_field(name="Your Roll", value=player_display, inline=True)
            embed.add_field(name="Bot Roll", value=bot_display, inline=True)
            embed.add_field(name="Result", value=result_text, inline=False)
            embed.set_footer(text=f"Bet: {bet:,} UC • {BOT_CODE_VERSION}")
            
            await message.reply(embed=embed)
            return

        # ── ?plinko ── Plinko game
        if lowered.startswith("?plinko"):
            parts = content.split()
            bet = 50  # Default bet
            risk = "medium"  # Default risk
            
            # Parse arguments: ?plinko [bet] [risk]
            if len(parts) >= 2:
                # First arg could be bet or risk
                if parts[1].isdigit():
                    bet = int(parts[1])
                    if len(parts) >= 3:
                        risk = parts[2].lower()
                elif parts[1] in {"low", "medium", "high"}:
                    risk = parts[1].lower()
                    if len(parts) >= 3 and parts[2].isdigit():
                        bet = int(parts[2])
            
            if bet < 10:
                await message.reply("❌ Minimum bet is 10 UC!")
                return
            
            if risk not in {"low", "medium", "high"}:
                await message.reply(
                    "🔴 **Plinko**\n"
                    "Drop a ball through the pyramid!\n\n"
                    "**Usage:** `?plinko <bet> <risk>`\n"
                    "**Risks:** `low`, `medium`, `high`\n\n"
                    "• **Low Risk:** Safer, smaller multipliers (0.5x - 1.5x)\n"
                    "• **Medium Risk:** Balanced (0.4x - 3x)\n"
                    "• **High Risk:** Risky, huge rewards possible (0.2x - 10x)\n\n"
                    "Example: `?plinko 100 high`"
                )
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Not enough UC! You have **{current_balance:,} UC**.")
                return
            
            # Play Plinko via API
            result = await self.client.api.play_plinko(risk, bet)  # type: ignore[attr-defined]
            
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
                return
            
            multiplier = result.get("multiplier", 1)
            payout = result.get("payout", bet)
            path = result.get("path", [])
            final_pos = result.get("finalPosition", 4)
            
            # Create visual pyramid display
            risk_emojis = {"low": "🟢", "medium": "🟡", "high": "🔴"}
            risk_emoji = risk_emojis.get(risk, "🟡")
            
            # Build path visualization
            path_display = " → ".join(["⬅️" if p == "L" else "➡️" for p in path[-4:]])  # Show last 4 moves
            
            # Multiplier display for this risk level
            multipliers = {
                "low": [1.5, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.5],
                "medium": [3, 1.5, 1.2, 0.7, 0.4, 0.7, 1.2, 1.5, 3],
                "high": [10, 3, 1.5, 0.5, 0.2, 0.5, 1.5, 3, 10],
            }
            mult_row = multipliers[risk]
            mult_display = " ".join([f"**{m}x**" if i == final_pos else f"{m}x" for i, m in enumerate(mult_row)])
            
            # Landing slots visual
            slots = ["⚫"] * 9
            slots[final_pos] = "🔵"
            slots_display = " ".join(slots)
            
            # Net profit/loss
            net = payout - bet
            won = net >= 0
            
            if won:
                if net > 0:
                    result_text = f"🎉 **WIN!** +{net:,} UC (x{multiplier})"
                    color = discord.Color.green()
                    # Award net profit
                    await self.client.api.send_reward(  # type: ignore[attr-defined]
                        str(message.author.id), net, "plinko", f"Plinko win (x{multiplier})"
                    )
                else:
                    result_text = f"🤝 **Break even!** x{multiplier}"
                    color = discord.Color.gold()
            else:
                result_text = f"💀 **Lost!** {net:,} UC (x{multiplier})"
                color = discord.Color.red()
                # Deduct loss
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), net, "plinko", f"Plinko loss (x{multiplier})"
                )
            
            embed = discord.Embed(
                title=f"🔴 Plinko {risk_emoji}",
                description=(
                    f"```\n{slots_display}\n```\n"
                    f"**Path:** {path_display}\n\n"
                    f"**Multipliers:**\n{mult_display}"
                ),
                color=color
            )
            embed.add_field(name="Bet", value=f"{bet:,} UC", inline=True)
            embed.add_field(name="Risk", value=risk.capitalize(), inline=True)
            embed.add_field(name="Multiplier", value=f"x{multiplier}", inline=True)
            embed.add_field(name="Result", value=result_text, inline=False)
            embed.set_footer(text=f"Payout: {payout:,} UC • {BOT_CODE_VERSION}")
            
            await message.reply(embed=embed)
            return

        # ── ?keno ── Keno game
        if lowered.startswith("?keno"):
            parts = content.split()
            bet = 50  # Default bet
            picks: list = []
            
            # Parse arguments: ?keno <numbers> <bet>
            # Example: ?keno 5,12,23,34,40 100
            # Or: ?keno 5 12 23 34 40 100
            if len(parts) >= 2:
                # Check if first arg contains commas (comma-separated numbers)
                if "," in parts[1]:
                    try:
                        picks = [int(x.strip()) for x in parts[1].split(",") if x.strip().isdigit()]
                    except ValueError:
                        pass
                    if len(parts) >= 3 and parts[2].isdigit():
                        bet = int(parts[2])
                else:
                    # Space-separated numbers, last numeric is bet
                    for p in parts[1:]:
                        if p.isdigit():
                            num = int(p)
                            if 1 <= num <= 40:
                                picks.append(num)
                            else:
                                # Could be bet if > 40
                                if num > 40:
                                    bet = num
            
            if len(picks) == 0 or len(picks) > 10:
                await message.reply(
                    "🎱 **Keno**\n"
                    "Pick 1-10 numbers between 1-40!\n\n"
                    "**Usage:** `?keno <numbers> [bet]`\n"
                    "**Example:** `?keno 5,12,23,34,40 100`\n"
                    "Or: `?keno 5 12 23 100` (last number > 40 = bet)\n\n"
                    "**How it works:**\n"
                    "• 10 numbers are drawn randomly\n"
                    "• More matches = higher multiplier!\n"
                    "• Pick 10 & match all = **5000x** 🤑"
                )
                return
            
            if bet < 10:
                await message.reply("❌ Minimum bet is 10 UC!")
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Not enough UC! You have **{current_balance:,} UC**.")
                return
            
            # Play Keno via API
            result = await self.client.api.play_keno(picks, bet)  # type: ignore[attr-defined]
            
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
                return
            
            drawn = result.get("drawnNumbers", [])
            matches = result.get("matches", [])
            match_count = result.get("matchCount", 0)
            multiplier = result.get("multiplier", 0)
            payout = result.get("payout", 0)
            
            # Create visual display
            picks_display = " ".join([f"**{n}**" if n in matches else str(n) for n in sorted(picks)])
            drawn_display = " ".join([f"🟢{n}" if n in matches else str(n) for n in drawn])
            
            # Net profit/loss
            net = payout - bet
            won = net > 0
            
            if won:
                result_text = f"🎉 **WIN!** +{net:,} UC (x{multiplier})"
                color = discord.Color.green()
                # Award net profit
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), net, "keno", f"Keno win ({match_count} matches, x{multiplier})"
                )
            elif payout == bet:
                result_text = f"🤝 **Break even!** x{multiplier}"
                color = discord.Color.gold()
            else:
                result_text = f"💀 **Lost!** -{bet:,} UC"
                color = discord.Color.red()
                # Deduct loss
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), -bet, "keno", f"Keno loss ({match_count} matches)"
                )
            
            embed = discord.Embed(
                title="🎱 Keno",
                description=(
                    f"**Your picks:** {picks_display}\n\n"
                    f"**Drawn:** {drawn_display}\n\n"
                    f"**Matches:** {match_count}/{len(picks)}"
                ),
                color=color
            )
            embed.add_field(name="Bet", value=f"{bet:,} UC", inline=True)
            embed.add_field(name="Multiplier", value=f"x{multiplier}", inline=True)
            embed.add_field(name="Payout", value=f"{payout:,} UC", inline=True)
            embed.add_field(name="Result", value=result_text, inline=False)
            embed.set_footer(text=f"Matched numbers: {', '.join(map(str, matches)) if matches else 'None'}")
            
            await message.reply(embed=embed)
            return

        # ── ?hump ── Camel Race Game 🐫
        if lowered.startswith("?hump"):
            parts = content.split()
            bet = 50  # Default bet
            
            if len(parts) >= 2 and parts[1].isdigit():
                bet = int(parts[1])
            
            if bet < 10:
                await message.reply("❌ Minimum bet is 10 UC!")
                return
            
            if bet > 10000:
                await message.reply("❌ Maximum bet is 10,000 UC!")
                return
            
            # Check balance
            balance_result = await self.client.api.get_balance(str(message.author.id))  # type: ignore[attr-defined]
            current_balance = safe_int_balance(balance_result.get("balance", 0))
            if current_balance < bet:
                await message.reply(f"❌ Not enough UC! You have **{current_balance:,} UC**.")
                return
            
            # 5 Camels racing
            camels = ["🐫", "🐪", "🦙", "🐎", "🦌"]
            camel_names = ["Sahara Sam", "Desert Duke", "Llama Larry", "Speedy Steve", "Antler Andy"]
            
            # Player picks a random camel
            player_camel = random.randint(0, 4)
            
            # Race animation frames
            race_length = 15
            positions = [0, 0, 0, 0, 0]
            
            # Create initial embed
            embed = discord.Embed(
                title="🏁 Camel Race - HUMP!",
                description=f"**Your camel:** {camels[player_camel]} {camel_names[player_camel]}\n**Bet:** {bet:,} UC\n\n🏁 Race starting...",
                color=discord.Color.gold()
            )
            race_msg = await message.reply(embed=embed)
            
            # Run the race with animation
            winner = None
            frame_count = 0
            max_frames = 8
            
            while winner is None and frame_count < max_frames:
                frame_count += 1
                await asyncio.sleep(0.8)
                
                # Move camels randomly
                for i in range(5):
                    positions[i] += random.randint(1, 4)
                    if positions[i] >= race_length:
                        positions[i] = race_length
                        if winner is None:
                            winner = i
                
                # Build race track display
                track_display = ""
                for i in range(5):
                    track = "▪️" * positions[i] + camels[i] + "▫️" * (race_length - positions[i]) + " 🏁"
                    track_display += f"{track}\n"
                
                embed.description = (
                    f"**Your camel:** {camels[player_camel]} {camel_names[player_camel]}\n"
                    f"**Bet:** {bet:,} UC\n\n"
                    f"```\n{track_display}```"
                )
                
                try:
                    await race_msg.edit(embed=embed)
                except Exception:
                    pass
            
            # If no winner yet, force finish
            if winner is None:
                winner = max(range(5), key=lambda x: positions[x])
            
            # Calculate result
            won = winner == player_camel
            
            if won:
                # Win multiplier based on odds (5 camels = ~4x feels fair, but 2.5x for balance)
                multiplier = 2.5
                payout = int(bet * multiplier)
                net = payout - bet
                
                embed.color = discord.Color.green()
                embed.add_field(
                    name="🎉 YOU WON!",
                    value=f"Your camel {camels[player_camel]} **{camel_names[player_camel]}** crossed first!\n\n"
                          f"**Payout:** +{net:,} UC (x{multiplier})",
                    inline=False
                )
                
                # Award winnings
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), net, "hump", f"Hump race win (x{multiplier})"
                )
            else:
                embed.color = discord.Color.red()
                embed.add_field(
                    name="💀 YOU LOST!",
                    value=f"Winner: {camels[winner]} **{camel_names[winner]}**\n"
                          f"Your camel {camels[player_camel]} didn't make it!\n\n"
                          f"**Lost:** -{bet:,} UC",
                    inline=False
                )
                
                # Deduct loss
                await self.client.api.send_reward(  # type: ignore[attr-defined]
                    str(message.author.id), -bet, "hump", "Hump race loss"
                )
            
            embed.set_footer(text="🐫 HUMP! - Camel Racing")
            
            try:
                await race_msg.edit(embed=embed)
            except Exception:
                await message.reply(embed=embed)
            return


            parts = content.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                await message.reply("❌ Usage: `?lookup <username>` or `?lookup #UID`")
                return

            query = parts[1].strip()
            try:
                result = await self.client.api.lookup_profile(query)  # type: ignore[attr-defined]
            except Exception as e:
                await message.reply(f"❌ Lookup failed: {e}")
                return

            if isinstance(result, dict) and result.get("error"):
                await message.reply(f"❌ {result['error']}")
                return

            username = result.get("username", query)
            display_name = result.get("display_name") or username
            bio = result.get("bio") or ""
            views = result.get("views_count", 0)
            likes = result.get("likes_count", 0)
            is_premium = result.get("is_premium", False)
            uid = result.get("uid")
            avatar_url = result.get("avatar_url")
            badges = result.get("badges") or []
            profile_url = f"https://uservault.cc/{username}"

            premium_badge = "⭐ " if is_premium else ""
            embed = discord.Embed(
                title=f"{premium_badge}{display_name}",
                url=profile_url,
                description=bio[:200] if bio else "(no bio)",
                color=discord.Color.blurple(),
            )
            
            # Add avatar as thumbnail
            if avatar_url:
                embed.set_thumbnail(url=avatar_url)
            
            embed.add_field(name="👁️ Views", value=str(views), inline=True)
            embed.add_field(name="❤️ Likes", value=str(likes), inline=True)
            
            if uid:
                embed.add_field(name="🆔 UID", value=f"#{uid}", inline=True)
            
            # Show badges
            if badges:
                badge_names = [b.get("name", "?") for b in badges[:8]]
                embed.add_field(
                    name=f"🏅 Badges ({len(badges)})",
                    value=", ".join(badge_names) + ("..." if len(badges) > 8 else ""),
                    inline=False,
                )
            
            embed.set_footer(text=f"uservault.cc/{username}")

            try:
                await message.reply(embed=embed)
            except discord.Forbidden:
                # No Embed Links permission → fallback to plain text
                badge_text = f" | 🏅 {len(badges)} badges" if badges else ""
                await message.reply(
                    f"👤 {display_name} (#{uid})\n{profile_url}\n👁️ Views: {views} | ❤️ Likes: {likes}{badge_text}"
                )
            return

        # ===== ?users - Admin only list registered users =====
        if lowered == "?users" or lowered.startswith("?users "):
            # Check admin
            admin_check = await self.client.api.check_admin(str(message.author.id))  # type: ignore[attr-defined]
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return

            result = await self.client.api.get_all_users(str(message.author.id))  # type: ignore[attr-defined]
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
                return

            users = result.get("users", [])
            count = int(result.get("count", 0) or 0)

            if not users:
                await message.reply("📋 No registered users found.")
                return

            # Show first 25 users (avoid spam)
            per_page = 25
            page_users = users[:per_page]
            lines = [
                f"**#{u.get('uid_number', '?')}** — {u.get('username', 'Unknown')}"
                for u in page_users
            ]

            embed = discord.Embed(
                title=f"📋 Registered Users ({count} total)",
                description="\n".join(lines)[:4000],
                color=discord.Color.blurple(),
            )
            embed.set_footer(text=f"Showing first {min(per_page, len(users))} of {count} • uservault.cc • v:{BOT_CODE_VERSION}")

            try:
                await message.reply(embed=embed)
            except discord.Forbidden:
                await message.reply("\n".join(lines))

            return

        # ===== ?ban <user> [reason] - Ban a user =====
        if lowered.startswith("?ban "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split(maxsplit=2)
            if len(parts) < 2:
                await message.reply("❌ Usage: `?ban <username> [reason]`")
                return
            
            target = parts[1]
            reason = parts[2] if len(parts) > 2 else "No reason provided"
            
            result = await self.client.api.admin_ban_user(str(message.author.id), target, reason)
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
            else:
                await message.reply(f"🔨 **User banned:** `{target}`\n📝 Reason: {reason}")
            return

        # ===== ?unban <user> - Unban a user =====
        if lowered.startswith("?unban "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split()
            if len(parts) < 2:
                await message.reply("❌ Usage: `?unban <username>`")
                return
            
            target = parts[1]
            result = await self.client.api.admin_unban_user(str(message.author.id), target)
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
            else:
                await message.reply(f"✅ **User unbanned:** `{target}`")
            return

        # ===== ?give <user> <amount> - Give UC to user =====
        if lowered.startswith("?give "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split()
            if len(parts) < 3:
                await message.reply("❌ Usage: `?give <username> <amount>`")
                return
            
            target = parts[1]
            try:
                amount = int(parts[2])
                if amount <= 0:
                    raise ValueError()
            except ValueError:
                await message.reply("❌ Amount must be a positive number!")
                return
            
            result = await self.client.api.admin_adjust_balance(str(message.author.id), target, amount)
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
            else:
                new_bal = result.get("new_balance", "?")
                await message.reply(f"💰 Gave **{amount:,} UC** to `{target}`\n💳 New Balance: **{new_bal:,} UC**")
            return

        # ===== ?take <user> <amount> - Take UC from user =====
        if lowered.startswith("?take "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split()
            if len(parts) < 3:
                await message.reply("❌ Usage: `?take <username> <amount>`")
                return
            
            target = parts[1]
            try:
                amount = int(parts[2])
                if amount <= 0:
                    raise ValueError()
            except ValueError:
                await message.reply("❌ Amount must be a positive number!")
                return
            
            result = await self.client.api.admin_adjust_balance(str(message.author.id), target, -amount)
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
            else:
                new_bal = result.get("new_balance", "?")
                await message.reply(f"💸 Took **{amount:,} UC** from `{target}`\n💳 New Balance: **{new_bal:,} UC**")
            return

        # ===== ?setbal <user> <amount> - Set user balance =====
        if lowered.startswith("?setbal "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split()
            if len(parts) < 3:
                await message.reply("❌ Usage: `?setbal <username> <amount>`")
                return
            
            target = parts[1]
            try:
                amount = int(parts[2])
                if amount < 0:
                    raise ValueError()
            except ValueError:
                await message.reply("❌ Amount must be a non-negative number!")
                return
            
            result = await self.client.api.admin_set_balance(str(message.author.id), target, amount)
            if result.get("error"):
                await message.reply(f"❌ {result['error']}")
            else:
                await message.reply(f"💳 Set `{target}`'s balance to **{amount:,} UC**")
            return

        # ===== ?broadcast <message> - Send announcement to all servers =====
        if lowered.startswith("?broadcast "):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            broadcast_msg = content[11:].strip()  # Remove "?broadcast "
            if not broadcast_msg:
                await message.reply("❌ Usage: `?broadcast <message>`")
                return
            
            embed = discord.Embed(
                title="📢 UserVault Announcement",
                description=broadcast_msg,
                color=discord.Color.gold(),
                timestamp=discord.utils.utcnow()
            )
            embed.set_footer(text=f"From {message.author.display_name}")
            
            sent_count = 0
            for guild in self.client.guilds:
                # Try to find a suitable channel
                channel = guild.system_channel or next((c for c in guild.text_channels if c.permissions_for(guild.me).send_messages), None)
                if channel:
                    try:
                        await channel.send(embed=embed)
                        sent_count += 1
                    except Exception:
                        pass
            
            await message.reply(f"📢 Broadcast sent to **{sent_count}** servers!")
            return

        # ===== ?stats - Show bot statistics =====
        if lowered == "?stats":
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            # Get API stats
            result = await self.client.api.get_bot_stats(str(message.author.id))
            
            embed = discord.Embed(
                title="📊 Bot Statistics",
                color=discord.Color.blurple(),
                timestamp=discord.utils.utcnow()
            )
            
            # Bot info
            embed.add_field(name="🤖 Servers", value=f"{len(self.client.guilds):,}", inline=True)
            embed.add_field(name="👥 Users", value=f"{sum(g.member_count or 0 for g in self.client.guilds):,}", inline=True)
            embed.add_field(name="📡 Latency", value=f"{self.client.latency*1000:.0f}ms", inline=True)
            
            # API stats if available
            if not result.get("error"):
                embed.add_field(name="💰 Total UC", value=f"{result.get('total_uc', 0):,}", inline=True)
                embed.add_field(name="🎮 Games Played", value=f"{result.get('games_played', 0):,}", inline=True)
                embed.add_field(name="🔗 Linked Users", value=f"{result.get('linked_users', 0):,}", inline=True)
            
            embed.set_footer(text=f"v:{BOT_CODE_VERSION}")
            await message.reply(embed=embed)
            return

        # ===== ?maintenance [on/off] - Toggle maintenance mode =====
        if lowered.startswith("?maintenance"):
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            parts = content.split()
            mode = parts[1].lower() if len(parts) > 1 else "status"
            
            if mode == "on":
                await self.client.change_presence(
                    status=discord.Status.dnd,
                    activity=discord.Game("🔧 Maintenance Mode")
                )
                await message.reply("🔧 **Maintenance mode enabled.** Bot status set to DND.")
            elif mode == "off":
                await self.client.change_presence(
                    status=discord.Status.online,
                    activity=discord.Game("uservault.cc | ?help")
                )
                await message.reply("✅ **Maintenance mode disabled.** Bot is back online!")
            else:
                await message.reply("ℹ️ Usage: `?maintenance on` or `?maintenance off`")
            return

        # ===== ?serverinfo - Show current server info =====
        if lowered == "?serverinfo":
            admin_check = await self.client.api.check_admin(str(message.author.id))
            if not admin_check.get("is_admin"):
                await message.reply("❌ Admin access required!")
                return
            
            guild = message.guild
            if not guild:
                await message.reply("❌ This command must be used in a server!")
                return
            
            embed = discord.Embed(
                title=f"🏠 {guild.name}",
                color=discord.Color.blurple(),
                timestamp=discord.utils.utcnow()
            )
            
            if guild.icon:
                embed.set_thumbnail(url=guild.icon.url)
            
            embed.add_field(name="👑 Owner", value=str(guild.owner) if guild.owner else "Unknown", inline=True)
            embed.add_field(name="📅 Created", value=f"<t:{int(guild.created_at.timestamp())}:R>", inline=True)
            embed.add_field(name="👥 Members", value=f"{guild.member_count:,}", inline=True)
            embed.add_field(name="💬 Channels", value=f"{len(guild.channels)}", inline=True)
            embed.add_field(name="🎭 Roles", value=f"{len(guild.roles)}", inline=True)
            embed.add_field(name="😀 Emojis", value=f"{len(guild.emojis)}", inline=True)
            embed.add_field(name="🆔 Server ID", value=f"`{guild.id}`", inline=False)
            
            embed.set_footer(text=f"v:{BOT_CODE_VERSION}")
            await message.reply(embed=embed)
            return

        # ===== Unknown command handling removed =====
        # Commands that are registered in the API but have no handler in the bot
        # will simply not respond. This avoids false "not implemented" warnings
        # and allows dynamic command deployment without bot code changes.

        active_guess_games = getattr(self.client, "active_guess_games", {})
        game = active_guess_games.get(message.author.id)
        if game and message.channel.id == game.get("channel_id"):
            try:
                guess_num = int(message.content)
                if 1 <= guess_num <= 100:
                    game["attempts"] -= 1
                    result = await self.client.api.check_guess(  # type: ignore[attr-defined]
                        game["secret"],
                        guess_num,
                        game["attempts"],
                    )

                    if result.get("correct"):
                        reward = result.get("reward", 50)
                        await message.reply(f"🎉 **Correct!** The number was {guess_num}! **+{reward} UC**")
                        await self.client.api.send_reward(  # type: ignore[attr-defined]
                            str(message.author.id),
                            reward,
                            "guess",
                            "Number guess",
                        )
                        del active_guess_games[message.author.id]
                    elif game["attempts"] == 0:
                        await message.reply(f"❌ Out of attempts! The number was {result.get('answer', '???')}.")
                        del active_guess_games[message.author.id]
                    else:
                        hint = result.get("hint", "Try again!")
                        await message.reply(f"{hint} ({game['attempts']} attempts left)")
            except ValueError:
                pass



# ============ UTILITY COMMANDS ============

@app_commands.command(name="link", description="🔗 Link your Discord to your UserVault account")
@app_commands.describe(code="The 6-character verification code from your UserVault dashboard")
async def link(interaction: discord.Interaction, code: str):
    """Link Discord account to UserVault using verification code."""
    await interaction.response.defer(ephemeral=True)
    
    result = await bot.api.link_account(str(interaction.user.id), code)
    
    if result.get("error"):
        await interaction.followup.send(f"❌ {result['error']}", ephemeral=True)
    elif result.get("success"):
        username = result.get("username", "your account")
        await interaction.followup.send(
            f"🔗 **Account Linked!**\n\n"
            f"✅ Your Discord is now linked to **{username}**\n"
            f"💰 You can now earn UC from games!",
            ephemeral=True
        )
    else:
        await interaction.followup.send(
            f"❌ **Linking Failed**\n\n"
            f"The code may be invalid or expired. Please generate a new code in your UserVault dashboard.",
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
    global _RUNNING_AS_EXTENSION
    _RUNNING_AS_EXTENSION = True

    # ===== CHECK HOST BOT CONFIGURATION =====
    # Prefix commands require the host bot to have:
    # 1. command_prefix set to include "?"
    # 2. message_content intent enabled
    
    # Check if prefix includes "?"
    prefix = getattr(client, "command_prefix", None)
    prefix_ok = False
    if callable(prefix):
        # Could be when_mentioned_or or similar - assume OK if it's a function
        prefix_ok = True
        print("ℹ️ [UserVault] Host bot uses a callable prefix - assuming '?' is included")
    elif isinstance(prefix, (list, tuple)):
        prefix_ok = "?" in prefix
    elif isinstance(prefix, str):
        prefix_ok = prefix == "?"
    
    if not prefix_ok and prefix is not None:
        print("⚠️ [UserVault] WARNING: Host bot prefix does not include '?'!")
        print(f"   Current prefix: {prefix}")
        print("   Prefix commands (?trivia, ?lookup, etc.) will NOT work!")
        print("   Fix: Set command_prefix=commands.when_mentioned_or('?') in your host bot")
    
    # Check message_content intent
    if hasattr(client, "intents") and not client.intents.message_content:
        print("⚠️ [UserVault] WARNING: message_content intent is DISABLED!")
        print("   Prefix commands (?trivia, ?lookup, etc.) will NOT work!")
        print("   Fix: Enable 'Message Content Intent' in Discord Developer Portal")
        print("   AND set intents.message_content = True in your host bot")

    # Register slash commands only if enabled
    # IMPORTANT: Make this idempotent so `reload_extension()` doesn't fail due to duplicates.
    if ENABLE_SLASH_COMMANDS:
        slash_cmds = [
            trivia,
            slots,
            coin,
            rps,
            blackjack,
            guess,
            balance,
            daily,
            link,
            unlink,
            profile,
            apistats,
        ]

        for cmd in slash_cmds:
            try:
                existing = client.tree.get_command(cmd.name)
                if existing is None:
                    client.tree.add_command(cmd)
            except Exception as e:
                # Never fail extension load because a slash command is already present
                print(f"⚠️ [UserVault] Could not register slash command '{getattr(cmd, 'name', '?')}' on setup: {e}")
    
    # If the client has an API attribute, use it; otherwise create one
    _ensure_uservault_client_state(client)

    # ===== FETCH COMMANDS FROM API =====
    # This is the key step that makes commands dynamic!
    try:
        print("📡 [UserVault] Fetching commands from API...")
        cmd_data = await fetch_commands_from_api(client.api, force=True)
        cmd_count = len(cmd_data.get("commands", []))
        print(f"✅ [UserVault] Loaded {cmd_count} commands from API")
    except Exception as e:
        print(f"⚠️ [UserVault] Failed to fetch commands from API: {e}")

    # Prefix commands + message listener (needed for '?guess')
    # IMPORTANT: Always remove+re-add to guarantee clean state on reload.
    try:
        if client.get_cog("UserVaultPrefixCommands") is not None:
            await client.remove_cog("UserVaultPrefixCommands")
            print("🔄 [UserVault] Removed old prefix cog")
    except Exception as e:
        print(f"⚠️ [UserVault] Could not remove old prefix cog: {e}")

    cog = UserVaultPrefixCommands(client)
    await client.add_cog(cog)
    client._uservault_prefix_cog_loaded = True
    print("📦 [UserVault] Prefix commands cog loaded")
    
    # Start notification polling if not already running
    if not hasattr(client, '_uservault_notification_task') or client._uservault_notification_task is None or client._uservault_notification_task.done():
        import sys
        from pathlib import Path as _Path

        def _detect_this_extension_name() -> str:
            """Best-effort detection of the extension name used by the host bot."""
            this_file = _Path(__file__).resolve()
            for ext_name in list(getattr(client, "extensions", {}).keys()):
                mod = sys.modules.get(ext_name)
                mod_file = getattr(mod, "__file__", None)
                if mod_file and _Path(mod_file).resolve() == this_file:
                    return ext_name

            # Fallback: choose something plausible
            for ext_name in list(getattr(client, "extensions", {}).keys()):
                low = ext_name.lower()
                if "uservault" in low or "api" in low or "bot" in low:
                    return ext_name

            return "bot"

        async def poll_notifications_for_extension():
            """Poll for command notifications and auto-reload extension on changes."""
            await client.wait_until_ready()

            channel = client.get_channel(COMMAND_UPDATES_CHANNEL_ID)
            if not channel:
                print(f"⚠️ [UserVault] Could not find channel {COMMAND_UPDATES_CHANNEL_ID} for command notifications")
                return

            print(f"📢 [UserVault] Sending command updates to #{channel.name}")

            while not client.is_closed():
                try:
                    result = await client.api.get_pending_notifications()
                    notifications = result.get("notifications") or []
                    needs_reload = False

                    if notifications:
                        for notif in notifications:
                            await send_notification_embed(client, channel, notif)
                            await client.api.mark_notification_processed(notif["id"])
                            if notif.get("action") in ("created", "updated"):
                                needs_reload = True

                    if needs_reload:
                        # First, refresh the command cache from API
                        print("🔄 [UserVault] Refreshing command cache due to notification...")
                        try:
                            global _CACHED_BOT_COMMANDS, _COMMANDS_LAST_FETCHED
                            _CACHED_BOT_COMMANDS = {}
                            _COMMANDS_LAST_FETCHED = 0
                            await fetch_commands_from_api(client.api, force=True)
                        except Exception as e:
                            print(f"⚠️ [UserVault] Failed to refresh commands: {e}")
                        
                        ext_name = _detect_this_extension_name()
                        print(f"🔄 [UserVault] Auto-reloading extension '{ext_name}' due to command update...")

                        try:
                            await channel.send(
                                f"🔄 **Auto-Reload**: Neue Commands deployed – reloading Extension `{ext_name}`… (v: `{BOT_CODE_VERSION}`)"
                            )
                        except Exception:
                            pass

                        # Force API client to be recreated on next setup() to avoid stale base URLs/caches
                        try:
                            if hasattr(client, "api"):
                                delattr(client, "api")
                        except Exception:
                            pass

                        # Stop this poller before reload to prevent duplicate loops
                        try:
                            if hasattr(client, "_uservault_notification_task") and client._uservault_notification_task is not None:
                                client._uservault_notification_task.cancel()
                            client._uservault_notification_task = None
                        except Exception:
                            pass

                        try:
                            await client.reload_extension(ext_name)
                        except Exception as e:
                            print(f"❌ [UserVault] Auto-reload failed: {e}")
                            try:
                                await channel.send(f"❌ Auto-Reload fehlgeschlagen: {e}. Bitte manuell reloaden.")
                            except Exception:
                                pass

                        return

                except Exception as e:
                    print(f"❌ [UserVault] Notification poll error: {e}")

                # Poll every 5 seconds
                await asyncio.sleep(5)

        client._uservault_notification_task = asyncio.create_task(poll_notifications_for_extension())
        print("📡 [UserVault] Started command notification polling (extension mode)")

        
        client._uservault_notification_task = asyncio.create_task(poll_notifications_for_extension())
        print("📡 [UserVault] Started command notification polling (extension mode)")
    
    print("✅ UserVault API Bot extension loaded!")


async def send_notification_embed(client: commands.Bot, channel, notif: dict):
    """Send a command notification embed to Discord."""
    action = notif.get("action", "unknown")
    command_name = notif.get("command_name", "unknown")
    changes = notif.get("changes", {})
    
    # Color based on action
    colors = {
        "created": discord.Color.green(),
        "updated": discord.Color.blue(),
        "deleted": discord.Color.red(),
    }
    
    # Emoji based on action
    emojis = {
        "created": "🆕",
        "updated": "✏️",
        "deleted": "🗑️",
    }
    
    usage = None
    if isinstance(changes, dict):
        usage = changes.get("usage")
    shown = usage or f"?{command_name}"

    embed = discord.Embed(
        title=f"{emojis.get(action, '📋')} Command {action.capitalize()}: {shown}",
        color=colors.get(action, discord.Color.greyple()),
        timestamp=discord.utils.utcnow()
    )
    
    if changes:
        changes_text = "\n".join([f"• **{k}**: {v}" for k, v in changes.items()])
        embed.add_field(name="Changes", value=changes_text[:1024], inline=False)
    
    embed.set_footer(text="UserVault Bot Commands")
    
    try:
        await channel.send(embed=embed)
    except Exception as e:
        print(f"❌ [UserVault] Failed to send notification: {e}")


# ============ RUN BOT ============

if __name__ == "__main__":
    # Only validate config when running standalone
    _validate_standalone_config()
    print("🚀 Starting UserVault Bot...")
    print(f"📡 API URL: {FUNCTIONS_BASE_URL}")
    bot.run(BOT_TOKEN)
