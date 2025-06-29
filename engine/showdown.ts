// Showdown logic and winner determination

import { logger } from "@trigger.dev/sdk/v3";
import { id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { Hand as PokerHand } from 'pokersolver';
import { Hand, Player } from './types';
import { db } from './game-setup';

/**
 * Perform showdown to determine winners and distribute pot
 * @param params - Parameters for the showdown
 */
export async function performShowdown({
  showdownPlayers,
  communityCards,
  potAmount,
  gameId,
  roundId,
  players
}: {
  showdownPlayers: { playerId: string; cards: string[] }[];
  communityCards: string[];
  potAmount: number;
  gameId: string;
  roundId: string;
  players: Record<string, Player>;
}): Promise<void> {
  
  if (showdownPlayers.length === 0 || potAmount === 0) {
    logger.warn("Invalid showdown parameters", { showdownPlayers, potAmount });
    return;
  }
  
  // Evaluate all hands
  const evaluatedHands = evaluateHands(showdownPlayers, communityCards);
  
  // Find winners
  const winners = findWinners(evaluatedHands);
  
  // Distribute pot to winners
  await distributePot(winners, potAmount, gameId, roundId, players);
  
  // Log results
  logShowdownResults(winners, potAmount);
}

/**
 * Evaluate poker hands for all players
 */
function evaluateHands(
  players: { playerId: string; cards: string[] }[],
  communityCards: string[]
): { playerId: string; hand: any }[] {
  
  return players.map(player => {
    // Combine hole cards with community cards
    const allCards = [...player.cards, ...communityCards];
    
    // Evaluate the best 5-card hand
    const hand = PokerHand.solve(allCards);
    
    return {
      playerId: player.playerId,
      hand
    };
  });
}

/**
 * Find the winning hand(s)
 */
function findWinners(
  evaluatedHands: { playerId: string; hand: any }[]
): { playerId: string; hand: any }[] {
  
  if (evaluatedHands.length === 0) {
    return [];
  }
  
  // Get all hands for comparison
  const hands = evaluatedHands.map(h => h.hand);
  
  // Find winning hand(s) - pokersolver handles ties
  const winningHands = PokerHand.winners(hands);
  
  // Map back to players
  return evaluatedHands.filter(h => winningHands.includes(h.hand));
}

/**
 * Distribute the pot among winners
 */
async function distributePot(
  winners: { playerId: string; hand: any }[],
  potAmount: number,
  gameId: string,
  roundId: string,
  players: Record<string, Player>
): Promise<void> {
  
  if (winners.length === 0) {
    logger.error("No winners found for pot distribution");
    return;
  }
  
  // Split pot evenly among winners
  const amountPerWinner = Math.floor(potAmount / winners.length);
  const remainder = potAmount % winners.length;
  
  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    const player = players[winner.playerId];
    
    if (!player) {
      logger.error("Winner player not found", { playerId: winner.playerId });
      continue;
    }
    
    // First winner gets any remainder from division
    const winAmount = amountPerWinner + (i === 0 ? remainder : 0);
    
    // Record winning transaction
    await db.transact(
      db.tx.transactions[id()].update({
        amount: winAmount,
        credit: true,
        createdAt: DateTime.now().toISO(),
      }).link({
        game: gameId,
        gameRound: roundId,
        player: winner.playerId
      })
    );
    
    // Update player stack
    const newStack = player.stack + winAmount;
    await db.transact(
      db.tx.players[winner.playerId].update({
        stack: newStack
      })
    );
    
    // Update local state
    player.stack = newStack;
    
    logger.log("Pot distributed to winner", {
      playerId: winner.playerId,
      amount: winAmount,
      handRank: winner.hand.name,
      handDescription: winner.hand.descr
    });
  }
}

/**
 * Log showdown results for debugging and analysis
 */
function logShowdownResults(
  winners: { playerId: string; hand: any }[],
  potAmount: number
): void {
  
  const winnerDetails = winners.map(w => ({
    playerId: w.playerId,
    handRank: w.hand.name,
    handDescription: w.hand.descr,
    cards: w.hand.cards
  }));
  
  logger.log("Showdown complete", {
    potAmount,
    winnerCount: winners.length,
    winners: winnerDetails
  });
}

/**
 * Handle the case where only one player remains (everyone else folded)
 * @param winnerId - The ID of the winning player
 * @param potAmount - The pot to award
 * @param gameId - Current game ID
 * @param roundId - Current round ID
 * @param players - Player states
 */
export async function awardPotToLastPlayer(
  winnerId: string,
  potAmount: number,
  gameId: string,
  roundId: string,
  players: Record<string, Player>
): Promise<void> {
  
  const player = players[winnerId];
  if (!player) {
    logger.error("Winner player not found", { winnerId });
    return;
  }
  
  // Record winning transaction
  await db.transact(
    db.tx.transactions[id()].update({
      amount: potAmount,
      credit: true,
      createdAt: DateTime.now().toISO(),
    }).link({
      game: gameId,
      gameRound: roundId,
      player: winnerId
    })
  );
  
  // Update player stack
  const newStack = player.stack + potAmount;
  await db.transact(
    db.tx.players[winnerId].update({
      stack: newStack
    })
  );
  
  // Update local state
  player.stack = newStack;
  
  logger.log("Pot awarded to last remaining player", {
    playerId: winnerId,
    amount: potAmount
  });
} 