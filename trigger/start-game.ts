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
import { shuffle } from '../engine/utils';

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
  run: async () => {
    logger.log("Starting new poker game", { 
      handsPerGame: GAME_CONFIG.HANDS_PER_GAME,
      initialStack: GAME_CONFIG.INITIAL_STACK 
    });
    
    // Initialize game and players
    const { gameId, players } = await initializeGame();
    
    // Play multiple rounds
    for (let roundIndex = 0; roundIndex < GAME_CONFIG.HANDS_PER_GAME; roundIndex++) {
      // Calculate positions for this round
      const buttonPosition = roundIndex % GAME_CONFIG.PLAYER_COUNT;
      
      // Create fresh deck for each round
      const deck = createDeck();
      shuffle(deck);
      
      // Wait between rounds for better pacing
      if (roundIndex > 0) {
        await wait.for({ seconds: GAME_CONFIG.WAIT_TIME_SECONDS });
      }
      
      // Update game state with new positions
      await updateGameState(gameId, buttonPosition, deck);
      
      // Reset any busted players
      await resetBustedPlayers(players);
      
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
    }
    
    logger.log("Game completed", { 
      gameId, 
      totalRounds: GAME_CONFIG.HANDS_PER_GAME 
    });
    
    return {
      gameId,
      roundsPlayed: GAME_CONFIG.HANDS_PER_GAME,
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