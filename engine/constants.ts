// Game constants and configuration

export const GAME_CONFIG = {
  INITIAL_STACK: 2000,
  HANDS_PER_GAME: 3,
  SMALL_BLIND: 5,
  BIG_BLIND: 10,
  MIN_BET: 5,
  PLAYER_COUNT: 6,
  WAIT_TIME_SECONDS: 3,
  MAX_DURATION: 100000, // 100 seconds
} as const;

export const AI_MODELS = [
  {
    name: "Gemini 2.5 Flash",
    model: "google/gemini-2.5-flash",
  },
  {
    name: "Gemini 2.5 Pro",
    model: "google/gemini-2.5-pro",
  },
  {
    name: "Claude Sonnet 4",
    model: "anthropic/claude-sonnet-4",
  },
  {
    name: "GPT-4.1",
    model: "openai/gpt-4.1",
  },
  {
    name: "O4 Mini",
    model: "openai/o4-mini",
  },
  {
    name: "Grok 3 Beta",
    model: "x-ai/grok-3-beta",
  },
] as const;

// Create a standard 52-card deck
export function createDeck(): string[] {
  const suits = ['c', 'h', 'd', 's'];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const deck: string[] = [];
  
  for (const rank of ranks) {
    for (const suit of suits) {
      deck.push(`${rank}${suit}`);
    }
  }
  
  return deck;
} 