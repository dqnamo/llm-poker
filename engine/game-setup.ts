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
 * Initialize a new game with default settings
 * @returns Game ID and initial game state
 */
export async function initializeGame(): Promise<{
  gameId: string;
  players: Record<string, Player>;
}> {
  const deck = createDeck();
  shuffle(deck);
  const gameId = id();

  // Create game record
  await db.transact(
    db.tx.games[gameId].update({
      totalRounds: GAME_CONFIG.HANDS_PER_GAME,
      createdAt: DateTime.now().toISO(),
      buttonPosition: 0,
      currentActivePosition: 3,
      deck: { cards: deck },
    })
  );

  logger.log("Game created", { gameId });

  // Initialize players
  const players = await initializePlayers(gameId);

  return { gameId, players };
}

/**
 * Initialize all players for the game
 * @param gameId - The game ID to link players to
 * @returns Record of initialized players
 */
async function initializePlayers(gameId: string): Promise<Record<string, Player>> {
  const players: Record<string, Player> = {};

  for (let i = 0; i < GAME_CONFIG.PLAYER_COUNT; i++) {
    const playerId = id();
    const model = AI_MODELS[i];

    await db.transact(
      db.tx.players[playerId]
        .update({
          name: model,
          stack: GAME_CONFIG.INITIAL_STACK,
          status: "active",
          model: model,
          createdAt: DateTime.now().toISO(),
        })
        .link({ game: gameId })
    );

    players[playerId] = {
      id: playerId,
      cards: [],
      stack: GAME_CONFIG.INITIAL_STACK,
      model: model,
    };

    logger.log("Player created", { playerId, model });
  }

  return players;
}

/**
 * Reset players who have run out of chips
 * @param players - Current player states
 */
export async function resetBustedPlayers(players: Record<string, Player>): Promise<void> {
  const bustedPlayers = Object.values(players).filter(player => player.stack <= 0);

  for (const player of bustedPlayers) {
    await db.transact(
      db.tx.players[player.id].update({
        stack: GAME_CONFIG.INITIAL_STACK,
      })
    );

    players[player.id].stack = GAME_CONFIG.INITIAL_STACK;
    logger.log("Player reset", { playerId: player.id, newStack: GAME_CONFIG.INITIAL_STACK });
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