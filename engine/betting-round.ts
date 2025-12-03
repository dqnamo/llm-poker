// Betting round logic and action processing

import { logger } from './logger';
import { id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { 
  Hand, 
  Player, 
  Pot, 
  BettingRoundResult, 
  BettingRoundType 
} from './types';
import { db } from './game-setup';
import { generateAction, AIProvider } from './ai-player';
import {
  countActivePlayers,
  getEligiblePlayers,
  isBettingRoundComplete,
  markOthersAsNotActed,
  resetPlayerActions,
  calculateSidePots
} from './utils';

/**
 * Process a complete betting round
 * @param params - All parameters needed for the betting round
 * @returns Result of the betting round including updated state
 */
export async function performBettingRound({
  context,
  highestBet,
  pot,
  hands,
  gameId,
  roundId,
  bettingRoundId,
  players,
  startingPlayer,
  pots,
  buttonPosition,
  apiKey,
  provider = 'openrouter'
}: {
  context: string[];
  highestBet: number;
  pot: number;
  hands: Record<string, Hand>;
  gameId: string;
  roundId: string;
  bettingRoundId: string;
  players: Record<string, Player>;
  startingPlayer: number;
  pots: Pot[];
  buttonPosition: number;
  apiKey?: string;
  provider?: AIProvider;
}): Promise<BettingRoundResult> {
  
  logger.log("Starting betting round", { bettingRoundId, highestBet, pot });
  
  let currentPlayer = startingPlayer;
  const handKeys = Object.keys(hands);
  
  // Continue until betting round is complete
  while (!isBettingRoundComplete(hands, highestBet)) {
    const currentHand = hands[handKeys[currentPlayer]];
    const player = players[currentHand.playerId];
    
    // Skip folded, all-in, or empty seat players
    if (currentHand.folded || currentHand.allIn || player.model === 'empty') {
      currentPlayer = (currentPlayer + 1) % handKeys.length;
      continue;
    }
    
    // Update current active position in the game
    await db.transact(
      db.tx.games[gameId].update({
        currentActivePosition: currentPlayer,
      })
    );
    
    // pause for 1 second
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get AI decision
    const action = await getPlayerAction(
      currentHand,
      highestBet,
      context,
      pot,
      players[currentHand.playerId],
      currentPlayer,
      buttonPosition,
      handKeys.length,
      apiKey,
      provider
    );
    
    // Process the action
    const actionResult = await processAction({
      action,
      hand: currentHand,
      hands,
      highestBet,
      pot,
      gameId,
      roundId,
      bettingRoundId,
      players,
      context
    });
    
    // Update state from action result
    highestBet = actionResult.highestBet;
    pot = actionResult.pot;
    
    // Check for early round end (only one active player)
    if (countActivePlayers(hands) <= 1) {
      break;
    }
    
    // Move to next player
    currentPlayer = (currentPlayer + 1) % handKeys.length;
  }
  
  // Calculate final pots including side pots
  const finalPots = finalizePots(hands, pot, pots);
  
  // Reset for next betting round
  resetPlayerActions(hands);
  
  return {
    context,
    hands,
    pot,
    pots: finalPots
  };
}

/**
 * Get a player's action for the current game state
 */
async function getPlayerAction(
  hand: Hand,
  highestBet: number,
  context: string[],
  pot: number,
  player: Player,
  currentPlayer: number,
  buttonPosition: number,
  totalPlayers: number,
  apiKey?: string,
  provider: AIProvider = 'openrouter'
): Promise<any> {
  // Safety check: empty seats should never reach here
  if (player.model === 'empty') {
    logger.warn("Empty seat player reached getPlayerAction, auto-folding", { playerId: player.id });
    return {
      toolName: 'fold',
      args: { reasoning: 'Empty seat' }
    };
  }
  
  // Calculate position relative to button
  const positionFromButton = (currentPlayer - buttonPosition + totalPlayers) % totalPlayers;
  
  // Determine position name
  let position: string;
  if (positionFromButton === 0) {
    position = "Button (Dealer)";
  } else if (positionFromButton === 1) {
    position = "Small Blind";
  } else if (positionFromButton === 2) {
    position = "Big Blind";
  } else if (positionFromButton === 3) {
    position = "Under the Gun (UTG)";
  } else if (positionFromButton === 4 && totalPlayers >= 6) {
    position = "UTG+1";
  } else if (positionFromButton === totalPlayers - 1) {
    position = "Cutoff";
  } else {
    position = `Middle Position (MP${positionFromButton - 2})`;
  }
  
  const betToCall = highestBet - hand.amount;
  
  // Log big blind scenario for debugging
  if (position === "Big Blind" && betToCall === 0) {
    logger.log("Big blind can check", {
      playerId: hand.playerId,
      highestBet,
      handAmount: hand.amount,
      betToCall
    });
  }
  
  // Get player's notes
  const playerData = await db.query({
    players: {
      $: {
        where: {
          id: hand.playerId
        }
      }
    }
  });
  
  const notes = playerData?.players?.[0]?.notes;
  
  const toolCalls = await generateAction({
    playerId: hand.playerId,
    cards: hand.cards,
    bet: betToCall, // Amount needed to call
    context,
    pot,
    playerStack: player.stack,
    model: player.model,
    position,
    notes,
    apiKey,
    provider
  });
  
  return toolCalls[0]; // Return first action
}

/**
 * Process a player's action and update game state
 */
async function processAction({
  action,
  hand,
  hands,
  highestBet,
  pot,
  gameId,
  roundId,
  bettingRoundId,
  players,
  context
}: {
  action: any;
  hand: Hand;
  hands: Record<string, Hand>;
  highestBet: number;
  pot: number;
  gameId: string;
  roundId: string;
  bettingRoundId: string;
  players: Record<string, Player>;
  context: string[];
}): Promise<{ highestBet: number; pot: number }> {
  
  const actionId = id();
  const player = players[hand.playerId];
  
  switch (action.toolName) {
    case "bet": {
      const betAmount = action.args.amount;
      const actualBet = Math.min(betAmount, player.stack);
      
      // Log betting details
      logger.log("Player betting", {
        playerId: hand.playerId,
        requestedBet: betAmount,
        actualBet,
        currentHandAmount: hand.amount,
        highestBet,
        playerStack: player.stack,
        totalAfterBet: hand.amount + actualBet
      });
      
      // Record the action
      await db.transact(
        db.tx.actions[actionId].update({
          type: "bet",
          amount: actualBet,
          reasoning: action.args.reasoning,
          createdAt: DateTime.now().toISO(),
        }).link({
          game: gameId,
          gameRound: roundId,
          player: hand.playerId,
          bettingRound: bettingRoundId,
          hand: hand.id
        })
      );
      
      // Update player stack
      const newStack = player.stack - actualBet;
      await updatePlayerStack(hand.playerId, newStack);
      player.stack = newStack;
      
      // Record transaction
      await recordTransaction(gameId, roundId, hand.playerId, actualBet, false);
      
      // Update hand state
      hand.amount += actualBet;
      hand.acted = true;
      pot += actualBet;
      
      // Check if this is a raise
      if (hand.amount > highestBet) {
        highestBet = hand.amount;
        markOthersAsNotActed(hands, hand.playerId);
        
        // Determine if this is a call or raise for logging
        const previousHighest = highestBet - (hand.amount - actualBet);
        if (hand.amount > previousHighest) {
          context.push(`${hand.playerId} raised to ${hand.amount} (bet ${actualBet} chips)`);
        }
      } else if (hand.amount === highestBet) {
        context.push(`${hand.playerId} called ${actualBet}`);
      }
      
      // Check if player is all-in
      if (newStack === 0) {
        hand.allIn = true;
        context.push(`${hand.playerId} went all-in with ${actualBet}`);
      }
      
      break;
    }
    
    case "check": {
      await db.transact(
        db.tx.actions[actionId].update({
          type: "check",
          amount: 0,
          reasoning: action.args.reasoning,
          createdAt: DateTime.now().toISO(),
        }).link({
          game: gameId,
          gameRound: roundId,
          player: hand.playerId,
          bettingRound: bettingRoundId,
          hand: hand.id
        })
      );
      
      hand.acted = true;
      context.push(`${hand.playerId} checked`);
      break;
    }
    
    case "fold": {
      await db.transact(
        db.tx.actions[actionId].update({
          type: "fold",
          amount: 0,
          reasoning: action.args.reasoning,
          createdAt: DateTime.now().toISO(),
        }).link({
          game: gameId,
          gameRound: roundId,
          player: hand.playerId,
          bettingRound: bettingRoundId,
          hand: hand.id
        })
      );
      
      hand.folded = true;
      hand.acted = true;
      context.push(`${hand.playerId} folded`);
      break;
    }
  }
  
  return { highestBet, pot };
}

/**
 * Update a player's chip stack
 */
async function updatePlayerStack(playerId: string, newStack: number): Promise<void> {
  await db.transact(
    db.tx.players[playerId].update({ stack: newStack })
  );
}

/**
 * Record a financial transaction
 */
async function recordTransaction(
  gameId: string,
  roundId: string,
  playerId: string,
  amount: number,
  credit: boolean
): Promise<void> {
  await db.transact(
    db.tx.transactions[id()].update({
      amount,
      credit,
      createdAt: DateTime.now().toISO(),
    }).link({
      game: gameId,
      gameRound: roundId,
      player: playerId
    })
  );
}

/**
 * Finalize pots including side pot calculations
 */
function finalizePots(hands: Record<string, Hand>, pot: number, pots: Pot[]): Pot[] {
  // Calculate side pots if there are all-in players
  const hasAllInPlayers = Object.values(hands).some(hand => hand.allIn && !hand.folded);
  
  if (hasAllInPlayers) {
    return calculateSidePots(hands, pot);
  }
  
  // Otherwise, just update the main pot
  pots[0].amount += pot;
  pots[0].eligiblePlayerIds = getEligiblePlayers(hands);
  
  return pots;
}

/**
 * Create a new betting round in the database
 */
export async function createBettingRound(
  gameId: string,
  roundId: string,
  type: BettingRoundType,
  initialPot: number
): Promise<string> {
  const bettingRoundId = id();
  
  await db.transact(
    db.tx.bettingRounds[bettingRoundId].update({
      type,
      pot: initialPot,
      createdAt: DateTime.now().toISO(),
    }).link({
      game: gameId,
      gameRound: roundId
    })
  );
  
  logger.log(`${type} betting round created`, { bettingRoundId });
  
  return bettingRoundId;
} 