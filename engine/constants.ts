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
  {
    name: "Llama 4 Scout",
    model: "meta-llama/llama-4-scout",
  },
  {
    name: "Llama 4 Maverick",
    model: "meta-llama/llama-4-maverick",
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

export const OPENROUTER_MODELS = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek Chat" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "mistralai/mistral-nemo", name: "Mistral Nemo" },
  { id: "openai/gpt-4.1", name: "GPT-4.1" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini" },
  { id: "x-ai/grok-3-beta", name: "Grok 3 Beta" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
  { id: "x-ai/grok-3-mini-beta", name: "Grok 3 Mini Beta" },
  { id: "x-ai/grok-3", name: "Grok 3" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout" },
  { id: "openai/o4-mini", name: "o4 Mini" },
  { id: "x-ai/grok-4", name: "Grok 4" },
  { id: "deepseek/deepseek-r1-0528", name: "DeepSeek R1" },
  { id: "moonshotai/kimi-k2", name: "Kimi K2" },
];