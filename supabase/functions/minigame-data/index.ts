import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

// Trivia Questions
const triviaQuestions = [
  { q: "What is the capital of France?", a: ["paris"], reward: 25 },
  { q: "How many planets are in our solar system?", a: ["8", "eight"], reward: 20 },
  { q: "What year did the Titanic sink?", a: ["1912"], reward: 30 },
  { q: "What is the chemical symbol for gold?", a: ["au"], reward: 25 },
  { q: "Who painted the Mona Lisa?", a: ["leonardo da vinci", "da vinci", "leonardo"], reward: 30 },
  { q: "What is the largest ocean on Earth?", a: ["pacific", "pacific ocean"], reward: 20 },
  { q: "In what year did World War II end?", a: ["1945"], reward: 25 },
  { q: "What is the square root of 144?", a: ["12", "twelve"], reward: 20 },
  { q: "Who wrote Romeo and Juliet?", a: ["shakespeare", "william shakespeare"], reward: 25 },
  { q: "What is the capital of Japan?", a: ["tokyo"], reward: 20 },
  { q: "How many continents are there?", a: ["7", "seven"], reward: 15 },
  { q: "What is the largest mammal?", a: ["blue whale", "whale"], reward: 25 },
  { q: "What color do you get mixing blue and yellow?", a: ["green"], reward: 15 },
  { q: "What is H2O commonly known as?", a: ["water"], reward: 10 },
  { q: "How many sides does a hexagon have?", a: ["6", "six"], reward: 15 },
  { q: "What planet is known as the Red Planet?", a: ["mars"], reward: 20 },
  { q: "What is the tallest mountain in the world?", a: ["mount everest", "everest"], reward: 25 },
  { q: "How many hours are in a day?", a: ["24", "twenty four", "twentyfour"], reward: 10 },
  { q: "What is the currency of Japan?", a: ["yen"], reward: 20 },
  { q: "Who discovered gravity?", a: ["newton", "isaac newton"], reward: 25 },
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

// RPS configuration
const rpsChoices = ["rock", "paper", "scissors"];
const rpsEmojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

// Helper functions
function getRandomTrivia() {
  const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
  return {
    question: question.q,
    reward: question.reward,
    id: Math.random().toString(36).substring(7),
  };
}

function checkTriviaAnswer(questionText: string, answer: string): { correct: boolean; reward: number } {
  const question = triviaQuestions.find(q => q.q === questionText);
  if (!question) return { correct: false, reward: 0 };
  
  const isCorrect = question.a.some(a => a.toLowerCase() === answer.toLowerCase().trim());
  return { correct: isCorrect, reward: isCorrect ? question.reward : 0 };
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

function playRPS(playerChoice: string): { playerChoice: string; botChoice: string; result: "win" | "lose" | "tie"; playerEmoji: string; botEmoji: string } {
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
  };
}

function generateSecretNumber(): number {
  return Math.floor(Math.random() * 100) + 1;
}

function checkGuess(secret: number, guess: number): { result: "correct" | "higher" | "lower"; reward: number } {
  if (guess === secret) return { result: "correct", reward: 50 };
  if (guess < secret) return { result: "higher", reward: 0 };
  return { result: "lower", reward: 0 };
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    console.log(`Minigame data request: ${action}`);

    let responseData: unknown;

    switch (action) {
      case "get_trivia":
        responseData = getRandomTrivia();
        break;

      case "check_trivia":
        responseData = checkTriviaAnswer(params.question, params.answer);
        break;

      case "spin_slots":
        responseData = spinSlots();
        break;

      case "coin_flip":
        responseData = coinFlip();
        break;

      case "play_rps":
        if (!rpsChoices.includes(params.choice)) {
          responseData = { error: "Invalid choice. Use: rock, paper, scissors" };
        } else {
          responseData = playRPS(params.choice);
        }
        break;

      case "generate_number":
        responseData = { secret: generateSecretNumber() };
        break;

      case "check_guess":
        responseData = checkGuess(params.secret, params.guess);
        break;

      case "start_blackjack":
        responseData = startBlackjack(params.bet || 50);
        break;

      case "blackjack_hit":
        // Client sends current game state, we add a card
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

      case "blackjack_stand":
        // Dealer plays out
        const standDeck = params.deck as Card[];
        const dealerHand = params.dealerHand as Card[];
        const playerValue = params.playerValue as number;
        
        while (handValue(dealerHand) < 17) {
          dealerHand.push(standDeck.pop()!);
        }
        
        const dealerFinalValue = handValue(dealerHand);
        let result: "win" | "lose" | "push";
        let multiplier = 0;
        
        if (dealerFinalValue > 21) {
          result = "win";
          multiplier = 2;
        } else if (dealerFinalValue > playerValue) {
          result = "lose";
          multiplier = 0;
        } else if (dealerFinalValue < playerValue) {
          result = "win";
          multiplier = 2;
        } else {
          result = "push";
          multiplier = 1;
        }
        
        responseData = {
          dealerHand,
          dealerDisplay: formatHand(dealerHand),
          dealerValue: dealerFinalValue,
          result,
          multiplier,
        };
        break;

      case "get_config":
        // Return all game configurations
        responseData = {
          slots: { symbols: slotSymbols, payouts: slotPayouts },
          rps: { choices: rpsChoices, emojis: rpsEmojis },
          rewards: {
            coinflip: 50,
            rps: 40,
            numberGuess: 50,
            blackjackMultiplier: 2,
          },
        };
        break;

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
