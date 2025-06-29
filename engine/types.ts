// Type definitions for the poker game

export interface Player {
  id: string;
  cards: string[];
  stack: number;
  model: string;
}

export interface Hand {
  id: string;
  playerId: string;
  cards: string[];
  folded: boolean;
  amount: number;
  acted: boolean;
  stack: number;
  allIn: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface BettingRoundResult {
  context: string[];
  hands: Record<string, Hand>;
  pot: number;
  pots?: Pot[];
}

export interface GameConfig {
  initialStack: number;
  handsPerGame: number;
  smallBlind: number;
  bigBlind: number;
  minBet: number;
  playerCount: number;
}

export interface ActionResult {
  toolName: string;
  args: {
    amount?: number;
    reasoning: string;
  };
}

export type BettingRoundType = 'preflop' | 'flop' | 'turn' | 'river';

export const CARD_SUITS = ['c', 'h', 'd', 's'] as const;
export const CARD_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const; 