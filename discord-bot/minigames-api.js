// minigames-api.js - Thin client that pulls all game logic from API
const crypto = require('crypto');

const API_URL = 'https://api.uservault.cc/functions/v1';
const GAME_API = `${API_URL}/minigame-data`;
const REWARD_API = `${API_URL}/minigame-reward`;

// Active games storage (for multi-step games)
const activeGames = new Map();

// Generate HMAC signature for reward calls
function generateSignature(payload, secret) {
  const timestamp = Date.now().toString();
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return { signature, timestamp };
}

// Call game API (no auth needed - just game logic)
async function gameApi(action, params = {}) {
  const response = await fetch(GAME_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params })
  });
  return response.json();
}

// Call reward API (needs webhook secret)
async function rewardApi(action, discordUserId, webhookSecret, extra = {}) {
  const payload = { action, discordUserId, ...extra };
  const { signature, timestamp } = generateSignature(payload, webhookSecret);
  
  const response = await fetch(REWARD_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

// ============ GAME FUNCTIONS ============

async function getTrivia() {
  return gameApi('get_trivia');
}

async function checkTrivia(question, answer) {
  return gameApi('check_trivia', { question, answer });
}

async function spinSlots() {
  return gameApi('spin_slots');
}

async function flipCoin() {
  return gameApi('coin_flip');
}

async function playRPS(choice) {
  return gameApi('play_rps', { choice });
}

async function generateNumber() {
  return gameApi('generate_number');
}

async function checkGuess(secret, guess) {
  return gameApi('check_guess', { secret, guess });
}

async function startBlackjack(bet = 50) {
  return gameApi('start_blackjack', { bet });
}

async function blackjackHit(deck, playerHand) {
  return gameApi('blackjack_hit', { deck, playerHand });
}

async function blackjackStand(deck, dealerHand, playerValue) {
  return gameApi('blackjack_stand', { deck, dealerHand, playerValue });
}

async function getGameConfig() {
  return gameApi('get_config');
}

// ============ REWARD FUNCTIONS ============

async function sendReward(discordUserId, amount, gameType, description, webhookSecret) {
  return rewardApi('add_uv', discordUserId, webhookSecret, { amount, gameType, description });
}

async function getBalance(discordUserId, webhookSecret) {
  return rewardApi('get_balance', discordUserId, webhookSecret);
}

async function claimDaily(discordUserId, webhookSecret) {
  return rewardApi('daily_reward', discordUserId, webhookSecret);
}

module.exports = {
  activeGames,
  getTrivia,
  checkTrivia,
  spinSlots,
  flipCoin,
  playRPS,
  generateNumber,
  checkGuess,
  startBlackjack,
  blackjackHit,
  blackjackStand,
  getGameConfig,
  sendReward,
  getBalance,
  claimDaily,
};
