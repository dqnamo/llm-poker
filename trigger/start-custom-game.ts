/**
 * Custom poker game orchestration with user-selected models
 * 
 * This file coordinates the overall game flow for custom simulations,
 * managing multiple rounds of poker between AI players using models
 * selected by the user and their OpenRouter API key.
 */

import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { GAME_CONFIG, createDeck } from '../engine/constants';
import { Player } from '../engine/types';
import { AIProvider } from '../engine/ai-player';
import { 
  initializeCustomGame, 
  resetBustedPlayers, 
  updateGameState 
} from '../engine/game-setup';
import { performRound } from '../engine/round-manager';
import { shuffle, getNextButtonPosition, getNextNonEmptySeat } from '../engine/utils';

export interface PlayerConfig {
  model: string;
  seatNumber?: number;
  emptySeat?: boolean;
}

/**
 * Custom game task that runs a poker game with user-selected models
 * Manages multiple rounds between AI players using custom models
 */
export const startCustomGame = task({
  id: "start-custom-game",
  retry: {
    maxAttempts: 1,
  },
  maxDuration: GAME_CONFIG.MAX_DURATION,
  run: async (payload: { 
    gameId?: string;
    players: PlayerConfig[];
    startingStack: number;
    numberOfHands: number;
    apiKey: string;
    provider?: AIProvider;
  }, { ctx }) => {
    const { gameId: providedGameId, players, startingStack, numberOfHands, apiKey, provider = 'openrouter' } = payload;

    // Get the trigger handle ID from the context
    const triggerHandleId = ctx.run.id;

    logger.log("Starting custom poker game", { 
      players: players.map(p => ({ model: p.model, emptySeat: p.emptySeat })),
      startingStack,
      numberOfHands,
      triggerHandleId
    });
    
    // Initialize game and players with custom configuration, passing the handle ID
    const { gameId, players: gamePlayers } = await initializeCustomGame(
      players,
      startingStack,
      numberOfHands,
      providedGameId,
      triggerHandleId // Pass the handle ID to be saved in the game record
    );
    
    // Find the first non-empty seat to start as button
    let buttonPosition = getNextNonEmptySeat(gamePlayers, 0, GAME_CONFIG.PLAYER_COUNT);
    
    // Play multiple rounds
    for (let roundIndex = 0; roundIndex < numberOfHands; roundIndex++) {
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
      await resetBustedPlayers(gamePlayers, startingStack);
      
      // Play the round with custom API key
      try {
        await performRound({
          gameId,
          players: gamePlayers,
          deck,
          roundNumber: roundIndex + 1,
          buttonPosition,
          apiKey,
          provider
        });
        
        logger.log(`Round ${roundIndex + 1} completed successfully`);
      } catch (error) {
        logger.error(`Error in round ${roundIndex + 1}`, { error });
        // Continue to next round even if one fails
      }
      
      // Rotate button to next non-empty seat for next round
      buttonPosition = getNextButtonPosition(gamePlayers, buttonPosition, GAME_CONFIG.PLAYER_COUNT);
    }
    
    logger.log("Custom game completed", { 
      gameId, 
      totalRounds: numberOfHands 
    });
    
    return {
      gameId,
      roundsPlayed: numberOfHands,
      finalStacks: Object.entries(gamePlayers).map(([id, player]) => ({
        playerId: id,
        model: player.model,
        finalStack: player.stack
      }))
    };
  },
}); 