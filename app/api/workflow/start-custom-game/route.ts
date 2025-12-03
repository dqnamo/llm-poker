/**
 * Upstash Workflow endpoint for running custom poker games
 * 
 * This endpoint handles long-running poker game simulations with
 * user-selected AI models.
 */

import { serve } from "@upstash/workflow/nextjs";
import { GAME_CONFIG, createDeck } from '@/engine/constants';
import { AIProvider } from '@/engine/ai-player';
import { 
  initializeCustomGame, 
  resetBustedPlayers, 
  updateGameState,
} from '@/engine/game-setup';
import { performRound } from '@/engine/round-manager';
import { shuffle, getNextButtonPosition, getNextNonEmptySeat } from '@/engine/utils';
import { logger } from '@/engine/logger';

export interface PlayerConfig {
  model: string;
  seatNumber?: number;
  emptySeat?: boolean;
}

interface CustomGamePayload {
  gameId?: string;
  players: PlayerConfig[];
  startingStack: number;
  numberOfHands: number;
  apiKey: string;
  provider?: AIProvider;
}

export const { POST } = serve<CustomGamePayload>(
  async (context) => {
    const payload = context.requestPayload;
    const { 
      gameId: providedGameId, 
      players, 
      startingStack, 
      numberOfHands, 
      apiKey, 
      provider = 'openrouter' 
    } = payload;

    // Get the workflow run ID
    const workflowRunId = context.workflowRunId;

    logger.log("Starting custom poker game via Upstash Workflow", { 
      players: players.map(p => ({ model: p.model, emptySeat: p.emptySeat })),
      startingStack,
      numberOfHands,
      workflowRunId
    });
    
    // Initialize game step
    const { gameId, players: gamePlayers } = await context.run("initialize-game", async () => {
      return await initializeCustomGame(
        players,
        startingStack,
        numberOfHands,
        providedGameId,
        workflowRunId
      );
    });
    
    // Find the first non-empty seat to start as button
    let buttonPosition = getNextNonEmptySeat(gamePlayers, 0, GAME_CONFIG.PLAYER_COUNT);
    
    // Play multiple rounds
    for (let roundIndex = 0; roundIndex < numberOfHands; roundIndex++) {
      // Create fresh deck for each round
      const deck = createDeck();
      shuffle(deck);
      
      // Wait between rounds for better pacing
      if (roundIndex > 0) {
        await context.sleep(`wait-before-round-${roundIndex + 1}`, GAME_CONFIG.WAIT_TIME_SECONDS);
      }
      
      // Update game state step
      await context.run(`update-game-state-round-${roundIndex + 1}`, async () => {
        await updateGameState(gameId, buttonPosition, deck);
      });
      
      // Reset any busted players step
      await context.run(`reset-busted-players-round-${roundIndex + 1}`, async () => {
        await resetBustedPlayers(gamePlayers, startingStack);
      });
      
      // Play the round
      await context.run(`perform-round-${roundIndex + 1}`, async () => {
        await performRound({
          gameId,
          players: gamePlayers,
          deck,
          roundNumber: roundIndex + 1,
          buttonPosition,
          apiKey,
          provider
        });
      });
      
      logger.log(`Round ${roundIndex + 1} completed successfully`);
      
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
  {
    retries: 1,
  }
);

