// Game initialization and setup functions

import { init, id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { logger } from "@trigger.dev/sdk/v3";
import { Player } from './types';
import { GAME_CONFIG, AI_MODELS, createDeck } from './constants';
import { shuffle } from './utils';

// Initialize database
export const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "",
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN || "",
});

/**
 * Initialize a new game with configurable settings
 * @param handsPerGame - Number of hands to play in the game
 * @param initialStack - Starting stack size for each player
 * @param triggerHandleId - The trigger handle ID to save in the game record
 * @returns Game ID and initial game state
 */
export async function initializeGame(
  handsPerGame: number = GAME_CONFIG.HANDS_PER_GAME,
  initialStack: number = GAME_CONFIG.INITIAL_STACK,
  triggerHandleId?: string
): Promise<{
  gameId: string;
  players: Record<string, Player>;
}> {
  const deck = createDeck();
  shuffle(deck);
  const gameId = id();

  // Create game record
  await db.transact(
    db.tx.games[gameId].update({
      totalRounds: handsPerGame,
      createdAt: DateTime.now().toISO(),
      buttonPosition: 0,
      currentActivePosition: 3,
      deck: { cards: deck },
      jobHandleId: triggerHandleId,
    })
  );

  logger.log("Game created", { gameId, triggerHandleId });

  // Initialize players with custom stack size
  const players = await initializePlayers(gameId, initialStack);

  return { gameId, players };
}

/**
 * Initialize all players for the game
 * @param gameId - The game ID to link players to
 * @param initialStack - Starting stack size for each player
 * @returns Record of initialized players
 */
async function initializePlayers(gameId: string, initialStack: number): Promise<Record<string, Player>> {
  const players: Record<string, Player> = {};

  for (let i = 0; i < GAME_CONFIG.PLAYER_COUNT; i++) {
    const playerId = id();
    const model = AI_MODELS[i].model;

    await db.transact(
      db.tx.players[playerId]
        .update({
          name: AI_MODELS[i].name,
          stack: initialStack,
          status: "active",
          model: AI_MODELS[i].model,
          createdAt: DateTime.now().toISO(),
        })
        .link({ game: gameId })
    );

    players[playerId] = {
      id: playerId,
      cards: [],
      stack: initialStack,
      model: model,
    };

    logger.log("Player created", { playerId, model });
  }

  return players;
}

/**
 * Reset players who have run out of chips
 * @param players - Current player states
 * @param initialStack - Stack size to reset players to
 */
export async function resetBustedPlayers(
  players: Record<string, Player>, 
  initialStack: number = GAME_CONFIG.INITIAL_STACK
): Promise<void> {
  const bustedPlayers = Object.values(players).filter(player => player.stack <= 0);

  for (const player of bustedPlayers) {
    await db.transact(
      db.tx.players[player.id].update({
        stack: initialStack,
      })
    );

    players[player.id].stack = initialStack;
    logger.log("Player reset", { playerId: player.id, newStack: initialStack });
  }
}

/**
 * Update game state with new button and active positions
 * @param gameId - Game ID to update
 * @param buttonPosition - New button position
 * @param deck - Current deck state
 */
export async function updateGameState(
  gameId: string,
  buttonPosition: number,
  deck: string[]
): Promise<void> {
  const activePosition = (buttonPosition + 4) % GAME_CONFIG.PLAYER_COUNT;

  await db.transact(
    db.tx.games[gameId].update({
      buttonPosition,
      currentActivePosition: activePosition,
      deck: { cards: deck },
    })
  );
}

/**
 * Clear the active position when a round ends
 * @param gameId - Game ID to update
 */
export async function clearActivePosition(gameId: string): Promise<void> {
  await db.transact(
    db.tx.games[gameId].update({
      currentActivePosition: null,
    })
  );
}

/**
 * Initialize a custom game with user-selected models
 * @param models - Array of model IDs selected by the user
 * @param initialStack - Starting stack size for each player
 * @param handsPerGame - Number of hands to play in the game
 * @param providedGameId - Optional game ID to use instead of generating one
 * @param triggerHandleId - The trigger handle ID to save in the game record
 * @returns Game ID and initial game state
 */
export async function initializeCustomGame(
  models: string[],
  initialStack: number,
  handsPerGame: number,
  providedGameId?: string,
  triggerHandleId?: string
): Promise<{
  gameId: string;
  players: Record<string, Player>;
}> {
  const deck = createDeck();
  shuffle(deck);
  const gameId = providedGameId || id();

  // Create game record
  await db.transact(
    db.tx.games[gameId].update({
      totalRounds: handsPerGame,
      createdAt: DateTime.now().toISO(),
      buttonPosition: 0,
      currentActivePosition: 3,
      deck: { cards: deck },
      customGame: true,
      jobHandleId: triggerHandleId,
    })
  );

  logger.log("Custom game created", { gameId, triggerHandleId });

  // Initialize players with custom models
  const players: Record<string, Player> = {};

  for (let i = 0; i < models.length; i++) {
    const playerId = id();
    const model = models[i];
    const modelName = model.split('/').pop() || model;

    await db.transact(
      db.tx.players[playerId]
        .update({
          name: `Player ${i + 1} (${modelName})`,
          stack: initialStack,
          status: "active",
          model: model,
          createdAt: DateTime.now().toISO(),
        })
        .link({ game: gameId })
    );

    players[playerId] = {
      id: playerId,
      cards: [],
      stack: initialStack,
      model: model,
    };

    logger.log("Custom player created", { playerId, model });
  }

  return { gameId, players };
} 