import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

// ============ GAME DEFINITIONS (Dynamic) ============

interface GameDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: "instant" | "interactive" | "multi-round";
  options?: { name: string; value: string }[];
  rewards: {
    min: number;
    max: number;
    currency: string;
  };
}

const gameDefinitions: GameDefinition[] = [
  {
    id: "trivia",
    name: "Trivia",
    description: "Answer questions and win UC!",
    emoji: "🎯",
    type: "interactive",
    rewards: { min: 10, max: 30, currency: "UC" }
  },
  {
    id: "slots",
    name: "Slots",
    description: "Spin the slot machine!",
    emoji: "🎰",
    type: "instant",
    rewards: { min: 10, max: 500, currency: "UC" }
  },
  {
    id: "coin",
    name: "Coinflip",
    description: "Flip a coin - heads or tails?",
    emoji: "🪙",
    type: "instant",
    options: [
      { name: "Heads", value: "heads" },
      { name: "Tails", value: "tails" }
    ],
    rewards: { min: 10, max: 10, currency: "UC" }
  },
  {
    id: "rps",
    name: "Rock Paper Scissors",
    description: "Classic RPS game!",
    emoji: "✂️",
    type: "instant",
    options: [
      { name: "🪨 Rock", value: "rock" },
      { name: "📄 Paper", value: "paper" },
      { name: "✂️ Scissors", value: "scissors" }
    ],
    rewards: { min: 15, max: 15, currency: "UC" }
  },
  {
    id: "blackjack",
    name: "Blackjack",
    description: "Play 21 against the dealer!",
    emoji: "🃏",
    type: "multi-round",
    rewards: { min: 50, max: 100, currency: "UC" }
  },
  {
    id: "guess",
    name: "Number Guess",
    description: "Guess the number (1-100)!",
    emoji: "🔢",
    type: "multi-round",
    rewards: { min: 25, max: 50, currency: "UC" }
  },
  {
    id: "balance",
    name: "Balance",
    description: "Check your UC balance",
    emoji: "💰",
    type: "instant",
    rewards: { min: 0, max: 0, currency: "UC" }
  },
  {
    id: "daily",
    name: "Daily Reward",
    description: "Claim your daily UC reward",
    emoji: "📅",
    type: "instant",
    rewards: { min: 25, max: 100, currency: "UC" }
  },
  {
    id: "plinko",
    name: "Plinko",
    description: "Drop a ball and watch it bounce for prizes!",
    emoji: "🔴",
    type: "instant",
    options: [
      { name: "Low Risk", value: "low" },
      { name: "Medium Risk", value: "medium" },
      { name: "High Risk", value: "high" }
    ],
    rewards: { min: 0, max: 1000, currency: "UC" }
  }
];

// ============ UTILITY COMMANDS (Non-Game) ============

interface UtilityCommand {
  id: string;
  name: string;
  description: string;
  emoji: string;
  options?: { name: string; value: string; description?: string }[];
}

const utilityCommands: UtilityCommand[] = [
  {
    id: "link",
    name: "Link Account",
    description: "Link your Discord to your UserVault account",
    emoji: "🔗",
  },
  {
    id: "unlink",
    name: "Unlink Account",
    description: "Unlink your Discord from UserVault",
    emoji: "🔓",
  },
  {
    id: "profile",
    name: "Profile",
    description: "View your UserVault profile",
    emoji: "👤",
  },
  {
    id: "apistats",
    name: "API Stats",
    description: "Show API request statistics",
    emoji: "📊",
  },
];

// ============ GAME CONFIGURATIONS ============

// Trivia Questions
const triviaQuestions = [
  { q: "What is the capital of France?", a: ["paris"], category: "Geography", reward: 25 },
  { q: "How many planets are in our solar system?", a: ["8", "eight"], category: "Science", reward: 20 },
  { q: "What year did the Titanic sink?", a: ["1912"], category: "History", reward: 30 },
  { q: "What is the chemical symbol for gold?", a: ["au"], category: "Science", reward: 25 },
  { q: "Who painted the Mona Lisa?", a: ["leonardo da vinci", "da vinci", "leonardo"], category: "Art", reward: 30 },
  { q: "What is the largest ocean on Earth?", a: ["pacific", "pacific ocean"], category: "Geography", reward: 20 },
  { q: "In what year did World War II end?", a: ["1945"], category: "History", reward: 25 },
  { q: "What is the square root of 144?", a: ["12", "twelve"], category: "Math", reward: 20 },
  { q: "Who wrote Romeo and Juliet?", a: ["shakespeare", "william shakespeare"], category: "Literature", reward: 25 },
  { q: "What is the capital of Japan?", a: ["tokyo"], category: "Geography", reward: 20 },
  { q: "How many continents are there?", a: ["7", "seven"], category: "Geography", reward: 15 },
  { q: "What is the largest mammal?", a: ["blue whale", "whale"], category: "Science", reward: 25 },
  { q: "What color do you get mixing blue and yellow?", a: ["green"], category: "General", reward: 15 },
  { q: "What is H2O commonly known as?", a: ["water"], category: "Science", reward: 10 },
  { q: "How many sides does a hexagon have?", a: ["6", "six"], category: "Math", reward: 15 },
  { q: "What planet is known as the Red Planet?", a: ["mars"], category: "Science", reward: 20 },
  { q: "What is the tallest mountain in the world?", a: ["mount everest", "everest"], category: "Geography", reward: 25 },
  { q: "How many hours are in a day?", a: ["24", "twenty four", "twentyfour"], category: "General", reward: 10 },
  { q: "What is the currency of Japan?", a: ["yen"], category: "Geography", reward: 20 },
  { q: "Who discovered gravity?", a: ["newton", "isaac newton"], category: "Science", reward: 25 },
];

// Slots configuration
const slotSymbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
const slotPayouts: Record<string, number> = {
  "💎💎💎": 500,
  "7️⃣7️⃣7️⃣": 300,
  "⭐⭐⭐": 150,
  "🍇🍇🍇": 100,
  "🍊🍊🍊": 75,
  "🍋🍋🍋": 50,
  "🍒🍒🍒": 25,
};

// Plinko configuration - multipliers for each row position
// 8 rows, ball bounces left or right at each level
// Low risk: more centered outcomes, Medium: balanced, High: extreme edges
const plinkoMultipliers: Record<string, number[]> = {
  low: [1.5, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.5],    // 9 landing positions
  medium: [3, 1.5, 1.2, 0.7, 0.4, 0.7, 1.2, 1.5, 3],
  high: [10, 3, 1.5, 0.5, 0.2, 0.5, 1.5, 3, 10],
};

// RPS configuration
const rpsChoices = ["rock", "paper", "scissors"];
const rpsEmojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

// Reward amounts
const rewards = {
  coinflip: 10,
  rps: 15,
  numberGuessBase: 50,
  numberGuessBonus: 5, // per remaining attempt
  blackjackWin: 100,
  blackjackBlackjack: 75,
  dailyBase: 25,
  dailyStreakBonus: 5, // per day streak
  dailyMaxStreak: 50,
};

// ============ HELPER FUNCTIONS ============

function getRandomTrivia() {
  const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
  // Generate wrong answers for multiple choice
  const wrongAnswers = triviaQuestions
    .filter(q => q.q !== question.q)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(q => q.a[0]);
  
  const correctAnswer = question.a[0];
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  
  return {
    question: question.q,
    category: question.category,
    options,
    correctAnswer,
    reward: question.reward,
    id: Math.random().toString(36).substring(7),
  };
}

function checkTriviaAnswer(questionText: string, answer: string): { correct: boolean; reward: number; correctAnswer: string } {
  const question = triviaQuestions.find(q => q.q === questionText);
  if (!question) return { correct: false, reward: 0, correctAnswer: "" };
  
  const isCorrect = question.a.some(a => a.toLowerCase() === answer.toLowerCase().trim());
  return { 
    correct: isCorrect, 
    reward: isCorrect ? question.reward : 0,
    correctAnswer: question.a[0].charAt(0).toUpperCase() + question.a[0].slice(1)
  };
}

function spinSlots(): { result: string[]; display: string; payout: number } {
  const result = [
    slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
    slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
    slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
  ];
  
  const resultStr = result.join("");
  let payout = 0;
  
  if (slotPayouts[resultStr]) {
    payout = slotPayouts[resultStr];
  } else if (result[0] === result[1] || result[1] === result[2]) {
    payout = 10;
  }
  
  return { result, display: result.join(" "), payout };
}

function coinFlip(): { result: "heads" | "tails"; emoji: string } {
  const result = Math.random() < 0.5 ? "heads" : "tails";
  return { result, emoji: result === "heads" ? "🪙" : "💿" };
}

function playRPS(playerChoice: string): { playerChoice: string; botChoice: string; result: "win" | "lose" | "tie"; playerEmoji: string; botEmoji: string; reward: number } {
  const botChoice = rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
  
  let result: "win" | "lose" | "tie";
  if (playerChoice === botChoice) {
    result = "tie";
  } else if (
    (playerChoice === "rock" && botChoice === "scissors") ||
    (playerChoice === "paper" && botChoice === "rock") ||
    (playerChoice === "scissors" && botChoice === "paper")
  ) {
    result = "win";
  } else {
    result = "lose";
  }
  
  return {
    playerChoice,
    botChoice,
    result,
    playerEmoji: rpsEmojis[playerChoice],
    botEmoji: rpsEmojis[botChoice],
    reward: result === "win" ? rewards.rps : 0,
  };
}

function generateSecretNumber(): number {
  return Math.floor(Math.random() * 100) + 1;
}

function checkGuess(secret: number, guess: number, attemptsLeft?: number): { correct: boolean; hint: string; reward: number; answer: number } {
  const isCorrect = guess === secret;
  const bonus = attemptsLeft ? attemptsLeft * rewards.numberGuessBonus : 0;
  
  return { 
    correct: isCorrect, 
    hint: guess < secret ? "📈 Higher!" : "📉 Lower!",
    reward: isCorrect ? rewards.numberGuessBase + bonus : 0,
    answer: secret
  };
}

// Plinko game logic
function playPlinko(risk: string, bet: number): { 
  path: string[]; 
  finalPosition: number; 
  multiplier: number; 
  payout: number;
  risk: string;
  display: string;
} {
  const validRisks = ["low", "medium", "high"];
  const riskLevel = validRisks.includes(risk) ? risk : "medium";
  const multipliers = plinkoMultipliers[riskLevel];
  
  // Simulate ball dropping through 8 rows
  // Ball starts at center (position 4), can go left (-1) or right (+1) at each row
  const path: string[] = [];
  let position = 4; // Start center (0-8 range, center is 4)
  
  for (let row = 0; row < 8; row++) {
    const goRight = Math.random() < 0.5;
    position = Math.max(0, Math.min(8, position + (goRight ? 1 : -1)));
    path.push(goRight ? "R" : "L");
  }
  
  // Map final position (0-8) to multiplier index (0-8)
  const multiplier = multipliers[position];
  const payout = Math.floor(bet * multiplier);
  
  // Create visual display
  const positionEmojis = ["🔴", "🟠", "🟡", "🟢", "⚪", "🟢", "🟡", "🟠", "🔴"];
  const slots = multipliers.map((m, i) => i === position ? "🔵" : "⚫");
  const display = slots.join("");
  
  return {
    path,
    finalPosition: position,
    multiplier,
    payout,
    risk: riskLevel,
    display,
  };
}

// Blackjack helpers
const suits = ["♠️", "♥️", "♦️", "♣️"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

interface Card {
  suit: string;
  value: string;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card: Card): number {
  if (card.value === "A") return 11;
  if (["K", "Q", "J"].includes(card.value)) return 10;
  return parseInt(card.value);
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  
  for (const card of hand) {
    total += cardValue(card);
    if (card.value === "A") aces++;
  }
  
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  
  return total;
}

function formatCard(card: Card): string {
  return `${card.value}${card.suit}`;
}

function formatHand(hand: Card[]): string {
  return hand.map(formatCard).join(" ");
}

function startBlackjack(bet: number): { 
  playerHand: Card[]; 
  dealerHand: Card[]; 
  deck: Card[]; 
  playerDisplay: string;
  dealerDisplay: string;
  playerValue: number;
  dealerValue: number;
  bet: number;
  gameId: string;
} {
  const deck = createDeck();
  const playerHand = [deck.pop()!, deck.pop()!];
  const dealerHand = [deck.pop()!, deck.pop()!];
  
  return {
    playerHand,
    dealerHand,
    deck,
    playerDisplay: formatHand(playerHand),
    dealerDisplay: `${formatCard(dealerHand[0])} ??`,
    playerValue: handValue(playerHand),
    dealerValue: handValue(dealerHand),
    bet,
    gameId: Math.random().toString(36).substring(7),
  };
}

// ============ REQUEST HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    console.log(`Minigame data request: ${action}`);

    let responseData: unknown;

    switch (action) {
      // ============ NEW: Get available games ============
      case "get_games":
        responseData = {
          games: gameDefinitions,
          currency: "UC",
          version: "2.0"
        };
        break;

      // ============ NEW: Get all commands (games + utilities) ============
      case "get_commands":
        responseData = {
          games: gameDefinitions,
          utilities: utilityCommands,
          currency: "UC",
          version: "2.1"
        };
        break;

      // ============ Trivia ============
      case "get_trivia":
        responseData = getRandomTrivia();
        break;

      case "check_trivia":
        responseData = checkTriviaAnswer(params.question, params.answer);
        break;

      // ============ Slots ============
      case "spin_slots":
        responseData = spinSlots();
        break;

      // ============ Coinflip ============
      case "coin_flip":
        responseData = coinFlip();
        break;

      // ============ RPS ============
      case "play_rps":
        if (!rpsChoices.includes(params.choice)) {
          responseData = { error: "Invalid choice. Use: rock, paper, scissors" };
        } else {
          responseData = playRPS(params.choice);
        }
        break;

      // ============ Plinko ============
      case "play_plinko": {
        const risk = params.risk || "medium";
        const bet = params.bet || 50;
        responseData = playPlinko(risk, bet);
        break;
      }

      // ============ Number Guess ============
      case "generate_number":
        responseData = { secret: generateSecretNumber() };
        break;

      case "check_guess":
        responseData = checkGuess(params.secret, params.guess, params.attemptsLeft);
        break;

      // ============ Blackjack ============
      case "start_blackjack":
        responseData = startBlackjack(params.bet || 50);
        break;

      case "blackjack_hit": {
        const hitDeck = params.deck as Card[];
        const hitHand = params.playerHand as Card[];
        hitHand.push(hitDeck.pop()!);
        responseData = {
          playerHand: hitHand,
          deck: hitDeck,
          playerDisplay: formatHand(hitHand),
          playerValue: handValue(hitHand),
          busted: handValue(hitHand) > 21,
        };
        break;
      }

      case "blackjack_stand": {
        const standDeck = params.deck as Card[];
        const dealerHand = params.dealerHand as Card[];
        const playerValue = params.playerValue as number;
        
        while (handValue(dealerHand) < 17) {
          dealerHand.push(standDeck.pop()!);
        }
        
        const dealerFinalValue = handValue(dealerHand);
        let result: "win" | "lose" | "push";
        let payout = 0;
        
        if (dealerFinalValue > 21) {
          result = "win";
          payout = rewards.blackjackWin;
        } else if (dealerFinalValue > playerValue) {
          result = "lose";
          payout = 0;
        } else if (dealerFinalValue < playerValue) {
          result = "win";
          payout = rewards.blackjackWin;
        } else {
          result = "push";
          payout = 0;
        }
        
        responseData = {
          dealerHand,
          dealerDisplay: formatHand(dealerHand),
          dealerValue: dealerFinalValue,
          result,
          payout,
        };
        break;
      }

      // ============ Config ============
      case "get_config":
        responseData = {
          games: gameDefinitions,
          currency: "UC",
          slots: { symbols: slotSymbols, payouts: slotPayouts },
          rps: { choices: rpsChoices, emojis: rpsEmojis },
          rewards,
        };
        break;

      // ============ Profile Lookup ============
      case "lookup_profile": {
        const query = params.username?.toString?.()?.trim?.();
        if (!query) {
          responseData = { error: "Username is required" };
          break;
        }
        
        // Create Supabase client for database access
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Support UID lookup (e.g., #1234) or username/alias lookup
        let profile = null;
        let profileError = null;
        
        if (query.startsWith("#")) {
          // UID lookup
          const uidStr = query.slice(1);
          const uid = parseInt(uidStr, 10);
          if (isNaN(uid)) {
            responseData = { error: `Invalid UID: ${query}` };
            break;
          }
          const res = await supabase
            .from("profiles")
            .select("id, username, display_name, bio, views_count, likes_count, dislikes_count, is_premium, avatar_url, created_at, uid_number")
            .eq("uid_number", uid)
            .single();
          profile = res.data;
          profileError = res.error;
        } else {
          // Username or alias lookup
          const username = query.toLowerCase();
          const res = await supabase
            .from("profiles")
            .select("id, username, display_name, bio, views_count, likes_count, dislikes_count, is_premium, avatar_url, created_at, uid_number")
            .or(`username.eq.${username},alias_username.eq.${username}`)
            .single();
          profile = res.data;
          profileError = res.error;
        }
        
        if (profileError || !profile) {
          responseData = { error: `Profile '${query}' not found` };
        } else {
          // Fetch badges for this profile
          let badges: { name: string; color: string | null; icon_url: string | null }[] = [];
          try {
            const { data: userBadges } = await supabase
              .from("user_badges")
              .select("badge_id, custom_color, is_enabled, display_order")
              .eq("user_id", profile.id)
              .eq("is_enabled", true)
              .order("display_order", { ascending: true })
              .limit(10);
            
            if (userBadges && userBadges.length > 0) {
              const badgeIds = userBadges.map((ub: { badge_id: string }) => ub.badge_id);
              const { data: globalBadges } = await supabase
                .from("global_badges")
                .select("id, name, color, icon_url")
                .in("id", badgeIds);
              
              if (globalBadges) {
                // Map with custom colors
                const badgeMap = new Map(globalBadges.map((b: { id: string; name: string; color: string | null; icon_url: string | null }) => [b.id, b]));
                badges = userBadges.map((ub: { badge_id: string; custom_color: string | null }) => {
                  const gb = badgeMap.get(ub.badge_id) as { name: string; color: string | null; icon_url: string | null } | undefined;
                  return gb ? { name: gb.name, color: ub.custom_color || gb.color, icon_url: gb.icon_url } : null;
                }).filter(Boolean) as { name: string; color: string | null; icon_url: string | null }[];
              }
            }
          } catch {
            // Ignore badge fetch errors
          }
          
          responseData = {
            username: profile.username,
            display_name: profile.display_name,
            bio: profile.bio,
            views_count: profile.views_count || 0,
            likes_count: profile.likes_count || 0,
            dislikes_count: profile.dislikes_count || 0,
            is_premium: profile.is_premium || false,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            uid: profile.uid_number,
            badges,
          };
        }
        break;
      }

      // ============ Get Commands for Help ============
      case "get_bot_commands": {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: cmds, error: cmdError } = await supabase
          .from("bot_commands")
          .select("name, description, category, usage, is_enabled")
          .eq("is_enabled", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });
        
        if (cmdError) {
          responseData = { error: cmdError.message };
        } else {
          responseData = { commands: cmds || [] };
        }
        break;
      }

      default:
        responseData = { error: "Unknown action" };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Minigame data error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
