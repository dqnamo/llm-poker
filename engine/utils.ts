// Utility functions for the poker game

import { Hand, Player, Pot } from './types';

/**
 * Fisher-Yates shuffle algorithm to shuffle an array in place
 * @param array - The array to shuffle
 */
export function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Calculate the position of a player relative to the button
 * @param buttonPosition - Current button position
 * @param offset - Offset from the button (1 for small blind, 2 for big blind, etc.)
 * @param playerCount - Total number of players
 * @returns The position of the player
 */
export function getPlayerPosition(buttonPosition: number, offset: number, playerCount: number): number {
  return (buttonPosition + offset) % playerCount;
}

/**
 * Get the player ID at a specific position
 * @param players - Record of players
 * @param position - Position to get player from
 * @returns Player ID at the position
 */
export function getPlayerIdAtPosition(players: Record<string, Player>, position: number): string {
  return Object.keys(players)[position];
}

/**
 * Find the next non-empty seat starting from a position
 * @param players - Record of players
 * @param startPosition - Starting position
 * @param playerCount - Total number of seats
 * @returns Position of the next non-empty seat
 */
export function getNextNonEmptySeat(
  players: Record<string, Player>, 
  startPosition: number, 
  playerCount: number
): number {
  const playerArray = Object.values(players);
  let position = startPosition;
  let attempts = 0;
  
  // Search for next non-empty seat (max attempts = playerCount to avoid infinite loop)
  while (attempts < playerCount) {
    const player = playerArray[position];
    if (player && player.model !== 'empty') {
      return position;
    }
    position = (position + 1) % playerCount;
    attempts++;
  }
  
  // If all seats are empty (shouldn't happen), return start position
  return startPosition;
}

/**
 * Get the next non-empty seat button position (for rotating button)
 * @param players - Record of players
 * @param currentButton - Current button position
 * @param playerCount - Total number of seats
 * @returns Next button position that is not an empty seat
 */
export function getNextButtonPosition(
  players: Record<string, Player>,
  currentButton: number,
  playerCount: number
): number {
  const nextPosition = (currentButton + 1) % playerCount;
  return getNextNonEmptySeat(players, nextPosition, playerCount);
}

/**
 * Check if betting round is complete
 * All active players must have acted and bet the same amount (or be all-in)
 * @param hands - Current hands in play
 * @param highestBet - Current highest bet
 * @returns True if betting round is complete
 */
export function isBettingRoundComplete(hands: Record<string, Hand>, highestBet: number): boolean {
  const activePlayers = Object.values(hands).filter(hand => !hand.folded && !hand.allIn);
  return activePlayers.every(hand => hand.amount === highestBet && hand.acted);
}

/**
 * Count active players (not folded and not all-in)
 * @param hands - Current hands in play
 * @returns Number of active players
 */
export function countActivePlayers(hands: Record<string, Hand>): number {
  return Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length;
}

/**
 * Get eligible players for a pot (not folded)
 * @param hands - Current hands in play
 * @returns Array of player IDs eligible for the pot
 */
export function getEligiblePlayers(hands: Record<string, Hand>): string[] {
  return Object.values(hands)
    .filter(hand => !hand.folded)
    .map(hand => hand.playerId);
}

/**
 * Reset player actions for a new betting round
 * @param hands - Current hands in play
 */
export function resetPlayerActions(hands: Record<string, Hand>): void {
  Object.values(hands).forEach(hand => {
    hand.acted = false;
    hand.amount = 0;
  });
}

/**
 * Mark all other players as not acted (for raises)
 * @param hands - Current hands in play
 * @param currentPlayerId - Player who just raised
 */
export function markOthersAsNotActed(hands: Record<string, Hand>, currentPlayerId: string): void {
  Object.values(hands).forEach(hand => {
    if (hand.playerId !== currentPlayerId) {
      hand.acted = false;
    }
  });
}

/**
 * Calculate side pots when players go all-in
 * @param hands - Current hands in play
 * @param mainPot - Current main pot amount
 * @returns Array of pots with amounts and eligible players
 */
export function calculateSidePots(hands: Record<string, Hand>, mainPot: number): Pot[] {
  const pots: Pot[] = [];
  const allInAmounts = new Set<number>();
  
  // Collect unique all-in amounts
  Object.values(hands).forEach(hand => {
    if (hand.allIn && hand.amount > 0) {
      allInAmounts.add(hand.amount);
    }
  });
  
  // Sort amounts in ascending order
  const sortedAmounts = Array.from(allInAmounts).sort((a, b) => a - b);
  
  let previousAmount = 0;
  for (const amount of sortedAmounts) {
    const eligiblePlayers = Object.values(hands)
      .filter(hand => !hand.folded && hand.amount >= amount)
      .map(hand => hand.playerId);
    
    const potAmount = (amount - previousAmount) * eligiblePlayers.length;
    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligiblePlayers
      });
    }
    
    previousAmount = amount;
  }
  
  // Add remaining main pot
  const remainingPlayers = Object.values(hands)
    .filter(hand => !hand.folded)
    .map(hand => hand.playerId);
  
  if (mainPot > 0 && remainingPlayers.length > 0) {
    pots.push({
      amount: mainPot,
      eligiblePlayerIds: remainingPlayers
    });
  }
  
  return pots;
}

/**
 * Format player name for display (extract model name from full path)
 * @param modelPath - Full model path (e.g., "google/gemini-2.0-flash-001")
 * @returns Formatted model name
 */
export function formatPlayerName(modelPath: string): string {
  const parts = modelPath.split('/');
  return parts[parts.length - 1] || modelPath;
} 