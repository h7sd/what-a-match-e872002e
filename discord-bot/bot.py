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

# Load environment variables
load_dotenv()

# Configuration
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
WEBHOOK_SECRET = os.getenv("DISCORD_WEBHOOK_SECRET")
API_URL = "https://api.uservault.cc/functions/v1"
GAME_API = f"{API_URL}/minigame-data"
REWARD_API = f"{API_URL}/minigame-reward"

# Validate configuration
if not BOT_TOKEN:
    raise ValueError("DISCORD_BOT_TOKEN is required!")
if not WEBHOOK_SECRET:
    raise ValueError("DISCORD_WEBHOOK_SECRET is required!")


class UserVaultAPI:
    """API client for UserVault minigame endpoints."""
    
    def __init__(self, webhook_secret: str):
        self.webhook_secret = webhook_secret
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _generate_signature(self, payload: dict) -> tuple[str, str]:
        """Generate HMAC signature for reward API calls."""
        timestamp = str(int(time.time() * 1000))
        message = f"{timestamp}.{json.dumps(payload, separators=(',', ':'))}"
        signature = hmac.new(
            self.webhook_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature, timestamp
    
    async def game_api(self, action: str, **params) -> dict:
        """Call the game API (no auth needed - just game logic)."""
        session = await self._get_session()
        payload = {"action": action, **params}
        
        async with session.post(GAME_API, json=payload) as response:
            return await response.json()
    
    async def reward_api(self, action: str, discord_user_id: str, **extra) -> dict:
        """Call the reward API (needs webhook secret)."""
        session = await self._get_session()
        payload = {"action": action, "discordUserId": discord_user_id, **extra}
        signature, timestamp = self._generate_signature(payload)
        
        headers = {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
        }
        
        async with session.post(REWARD_API, json=payload, headers=headers) as response:
            return await response.json()
    
    # ============ GAME METHODS ============
    
    async def get_available_games(self) -> dict:
        """Get list of available games from API."""
        return await self.game_api("get_games")
    
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
    
    async def setup_hook(self):
        """Called when the bot is ready to set up commands."""
        # Register all commands
        self.tree.add_command(trivia)
        self.tree.add_command(slots)
        self.tree.add_command(coin)
        self.tree.add_command(rps)
        self.tree.add_command(blackjack)
        self.tree.add_command(guess)
        self.tree.add_command(balance)
        self.tree.add_command(daily)
        
        # Sync commands
        await self.tree.sync()
        print("✅ Commands synced!")
    
    async def on_ready(self):
        print(f"🤖 Bot ready: {self.user}")
        print(f"📊 Connected to {len(self.guilds)} guilds")
    
    async def close(self):
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
