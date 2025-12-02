/**
 * Main poker game orchestration
 * 
 * This file coordinates the overall game flow, managing multiple rounds
 * of poker between AI players using different language models.
 */

import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { GAME_CONFIG, createDeck } from '../engine/constants';
import { 
  initializeGame, 
  resetBustedPlayers, 
  updateGameState 
} from '../engine/game-setup';
import { performRound } from '../engine/round-manager';
import { shuffle, getNextButtonPosition, getNextNonEmptySeat } from '../engine/utils';

/**
 * Main game task that runs a complete poker game
 * Manages multiple rounds between AI players
 */
export const startGame = task({
  id: "start-game",
  retry: {
    maxAttempts: 1,
  },
  maxDuration: GAME_CONFIG.MAX_DURATION,
  run: async (payload: { 
    handsPerGame?: number; 
    initialStack?: number; 
  } = {}, { ctx }) => {
    // Use provided values or fall back to defaults
    const handsPerGame = payload.handsPerGame ?? GAME_CONFIG.HANDS_PER_GAME;
    const initialStack = payload.initialStack ?? GAME_CONFIG.INITIAL_STACK;

    // Get the trigger handle ID from the context
    const triggerHandleId = ctx.run.id;

    logger.log("Starting new poker game", { 
      handsPerGame,
      initialStack,
      triggerHandleId
    });
    
    // Initialize game and players with custom values, passing the handle ID
    const { gameId, players } = await initializeGame(handsPerGame, initialStack, triggerHandleId);
    
    // Find the first non-empty seat to start as button
    let buttonPosition = getNextNonEmptySeat(players, 0, GAME_CONFIG.PLAYER_COUNT);
    
    // Play multiple rounds
    for (let roundIndex = 0; roundIndex < handsPerGame; roundIndex++) {
      // Button position is already set, will be rotated after each round
      
      // Create fresh deck for each round
      const deck = createDeck();
      shuffle(deck);
      
      // Wait between rounds for better pacing
      if (roundIndex > 0) {
        await wait.for({ seconds: GAME_CONFIG.WAIT_TIME_SECONDS });
      }
      
      // Update game state with new positions
      await updateGameState(gameId, buttonPosition, deck);
      
      // Reset any busted players with custom stack size
      await resetBustedPlayers(players, initialStack);
      
      // Play the round
      try {
        await performRound({
          gameId,
          players,
          deck,
          roundNumber: roundIndex + 1,
          buttonPosition
        });
        
        logger.log(`Round ${roundIndex + 1} completed successfully`);
      } catch (error) {
        logger.error(`Error in round ${roundIndex + 1}`, { error });
        // Continue to next round even if one fails
      }
      
      // Rotate button to next non-empty seat for next round
      buttonPosition = getNextButtonPosition(players, buttonPosition, GAME_CONFIG.PLAYER_COUNT);
    }
    
    logger.log("Game completed", { 
      gameId, 
      totalRounds: handsPerGame 
    });
    
    return {
      gameId,
      roundsPlayed: handsPerGame,
      finalStacks: Object.entries(players).map(([id, player]) => ({
        playerId: id,
        model: player.model,
        finalStack: player.stack
      }))
    };
  },
});

// Re-export performRound for backward compatibility if needed
export { performRound } from '../engine/round-manager';