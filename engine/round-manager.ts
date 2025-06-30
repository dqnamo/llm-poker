// Round management logic

import { logger } from "@trigger.dev/sdk/v3";
import { id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { Hand, Player, Pot } from './types';
import { GAME_CONFIG } from './constants';
import { db, clearActivePosition } from './game-setup';
import { performBettingRound, createBettingRound } from './betting-round';
import { performShowdown } from './showdown';
import { synthesizeRoundObservations } from './ai-player';
import { 
  getPlayerPosition, 
  getPlayerIdAtPosition,
  countActivePlayers,
  shuffle
} from './utils';

/**
 * Perform a complete poker round (hand)
 * @param params - Parameters for the round
 * @returns Round results
 */
export async function performRound({
  gameId,
  players,
  deck,
  roundNumber = 1,
  buttonPosition = 0
}: {
  gameId: string;
  players: Record<string, Player>;
  deck: string[];
  roundNumber?: number;
  buttonPosition?: number;
}) {
  logger.log(`Starting round ${roundNumber}`, { gameId, buttonPosition });
  
  // Initialize round
  const { roundId, hands, context } = await initializeRound(
    gameId,
    players,
    deck,
    roundNumber
  );
  
  // Deal hole cards first
  await dealHoleCards(gameId, roundId, players, hands, deck);
  
  // Now post blinds after cards are dealt
  const initialPot = await postBlindsAfterDeal(
    gameId,
    roundId,
    players,
    hands,
    buttonPosition,
    context
  );
  
  // Initialize pots array
  const pots: Pot[] = [{
    amount: 0,
    eligiblePlayerIds: []
  }];
  
  // Play all betting rounds
  const finalPots = await playAllBettingRounds(
    gameId,
    roundId,
    players,
    hands,
    deck,
    context,
    buttonPosition,
    initialPot,
    pots
  );
  
  // Clear active position
  await clearActivePosition(gameId);
  
  // Synthesize observations for each player
  await synthesizePlayerObservations(
    gameId,
    roundId,
    players,
    hands,
    context,
    deck.slice(-5) // Get the community cards (last 5 cards dealt)
  );
  
  return { roundId, hands, context };
}

/**
 * Initialize a new round
 */
async function initializeRound(
  gameId: string,
  players: Record<string, Player>,
  deck: string[],
  roundNumber: number
): Promise<{
  roundId: string;
  hands: Record<string, Hand>;
  context: string[];
}> {
  const roundId = id();
  
  // Create round record
  await db.transact(
    db.tx.gameRounds[roundId].update({
      roundNumber,
      communityCards: { cards: [] },
      pot: 0,
      createdAt: DateTime.now().toISO(),
    }).link({ game: gameId })
  );
  
  logger.log("Round created", { roundId, roundNumber });
  
  return {
    roundId,
    hands: {},
    context: []
  };
}

/**
 * Post small and big blinds
 */
async function postBlinds(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  buttonPosition: number,
  context: string[]
): Promise<{ pot: number }> {
  
  // Calculate positions
  const smallBlindPosition = getPlayerPosition(buttonPosition, 1, GAME_CONFIG.PLAYER_COUNT);
  const bigBlindPosition = getPlayerPosition(buttonPosition, 2, GAME_CONFIG.PLAYER_COUNT);
  
  const smallBlindPlayerId = getPlayerIdAtPosition(players, smallBlindPosition);
  const bigBlindPlayerId = getPlayerIdAtPosition(players, bigBlindPosition);
  
  // Create initial betting round for blinds
  const bettingRoundId = await createBettingRound(gameId, roundId, 'preflop', 0);
  
  // Note: We'll need to deal cards first before posting blinds
  // This is handled in the main performRound function
  
  return { pot: GAME_CONFIG.SMALL_BLIND + GAME_CONFIG.BIG_BLIND };
}

/**
 * Post blinds after cards are dealt
 */
async function postBlindsAfterDeal(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  buttonPosition: number,
  context: string[]
): Promise<number> {
  
  // Calculate positions
  const smallBlindPosition = getPlayerPosition(buttonPosition, 1, GAME_CONFIG.PLAYER_COUNT);
  const bigBlindPosition = getPlayerPosition(buttonPosition, 2, GAME_CONFIG.PLAYER_COUNT);
  
  const smallBlindPlayerId = getPlayerIdAtPosition(players, smallBlindPosition);
  const bigBlindPlayerId = getPlayerIdAtPosition(players, bigBlindPosition);
  
  // Create initial betting round for blinds
  const bettingRoundId = await createBettingRound(gameId, roundId, 'preflop', 0);
  
  // Find the hands for blind players
  const smallBlindHand = Object.values(hands).find(h => h.playerId === smallBlindPlayerId);
  const bigBlindHand = Object.values(hands).find(h => h.playerId === bigBlindPlayerId);
  
  // Post small blind
  if (smallBlindHand) {
    await postBlindWithHand(
      gameId,
      roundId,
      bettingRoundId,
      smallBlindPlayerId,
      smallBlindHand.id,
      GAME_CONFIG.SMALL_BLIND,
      "small blind",
      players,
      hands,
      context
    );
  }
  
  // Post big blind
  if (bigBlindHand) {
    await postBlindWithHand(
      gameId,
      roundId,
      bettingRoundId,
      bigBlindPlayerId,
      bigBlindHand.id,
      GAME_CONFIG.BIG_BLIND,
      "big blind",
      players,
      hands,
      context
    );
  }
  
  return GAME_CONFIG.SMALL_BLIND + GAME_CONFIG.BIG_BLIND;
}

/**
 * Post a blind bet with known hand ID
 */
async function postBlindWithHand(
  gameId: string,
  roundId: string,
  bettingRoundId: string,
  playerId: string,
  handId: string,
  amount: number,
  blindType: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  context: string[]
): Promise<void> {
  
  // Record transaction
  await db.transact(
    db.tx.transactions[id()].update({
      amount,
      credit: false,
      createdAt: DateTime.now().toISO(),
    }).link({
      game: gameId,
      gameRound: roundId,
      player: playerId
    })
  );
  
  // Record action
  await db.transact(
    db.tx.actions[id()].update({
      type: "bet",
      amount,
      reasoning: `Posted the ${blindType}`,
      createdAt: DateTime.now().toISO(),
    }).link({
      game: gameId,
      gameRound: roundId,
      player: playerId,
      hand: handId,
      bettingRound: bettingRoundId
    })
  );
  
  // Update player stack
  const newStack = players[playerId].stack - amount;
  await db.transact(
    db.tx.players[playerId].update({ stack: newStack })
  );
  
  players[playerId].stack = newStack;
  hands[handId].amount = amount;
  
  context.push(`Player ${playerId} posted the ${blindType}`);
}

/**
 * Deal hole cards to all players
 */
async function dealHoleCards(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  deck: string[]
): Promise<void> {
  
  const playerIds = Object.keys(players);
  
  for (const playerId of playerIds) {
    const handId = id();
    const card1 = deck.pop()!;
    const card2 = deck.pop()!;
    
    // Create hand record
    await db.transact(
      db.tx.hands[handId].update({
        cards: { cards: [card1, card2] },
        folded: false,
        createdAt: DateTime.now().toISO(),
      }).link({
        game: gameId,
        gameRound: roundId,
        player: playerId
      })
    );
    
    // Update player cards
    players[playerId].cards = [card1, card2];
    
    // Create hand object
    hands[handId] = {
      id: handId,
      playerId,
      cards: [card1, card2],
      amount: 0,
      folded: false,
      acted: false,
      stack: players[playerId].stack,
      allIn: false
    };
  }
  
  logger.log("Hole cards dealt", { playerCount: playerIds.length });
}

/**
 * Play all betting rounds (preflop, flop, turn, river)
 */
async function playAllBettingRounds(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  deck: string[],
  context: string[],
  buttonPosition: number,
  initialPot: number,
  pots: Pot[]
): Promise<Pot[]> {
  
  const preFlopStart = getPlayerPosition(buttonPosition, 3, GAME_CONFIG.PLAYER_COUNT);
  const postFlopStart = getPlayerPosition(buttonPosition, 1, GAME_CONFIG.PLAYER_COUNT);
  
  // Preflop betting
  const preflopResult = await playBettingRound(
    gameId,
    roundId,
    players,
    hands,
    context,
    'preflop',
    GAME_CONFIG.BIG_BLIND,
    initialPot,
    preFlopStart,
    pots,
    buttonPosition
  );
  
  if (!preflopResult || countActivePlayers(hands) <= 1) {
    await handlePotDistribution(gameId, roundId, players, hands, [], pots);
    return pots;
  }
  
  // Flop
  const flopCards = [deck.pop()!, deck.pop()!, deck.pop()!];
  await updateCommunityCards(gameId, roundId, flopCards);
  context.push(`The flop cards are ${flopCards.join(", ")}`);
  
  const flopResult = await playBettingRound(
    gameId,
    roundId,
    players,
    hands,
    context,
    'flop',
    0,
    0,
    postFlopStart,
    preflopResult.pots || pots,
    buttonPosition
  );
  
  if (!flopResult || countActivePlayers(hands) <= 1) {
    await handlePotDistribution(gameId, roundId, players, hands, flopCards, flopResult?.pots || pots);
    return flopResult?.pots || pots;
  }
  
  // Turn
  const turnCard = deck.pop()!;
  const turnCards = [...flopCards, turnCard];
  await updateCommunityCards(gameId, roundId, turnCards);
  context.push(`The turn card is ${turnCard}`);
  
  const turnResult = await playBettingRound(
    gameId,
    roundId,
    players,
    hands,
    context,
    'turn',
    0,
    0,
    postFlopStart,
    flopResult.pots || pots,
    buttonPosition
  );
  
  if (!turnResult || countActivePlayers(hands) <= 1) {
    await handlePotDistribution(gameId, roundId, players, hands, turnCards, turnResult?.pots || pots);
    return turnResult?.pots || pots;
  }
  
  // River
  const riverCard = deck.pop()!;
  const riverCards = [...turnCards, riverCard];
  await updateCommunityCards(gameId, roundId, riverCards);
  context.push(`The river card is ${riverCard}`);
  
  const riverResult = await playBettingRound(
    gameId,
    roundId,
    players,
    hands,
    context,
    'river',
    0,
    0,
    postFlopStart,
    turnResult.pots || pots,
    buttonPosition
  );
  
  // Final showdown
  await handlePotDistribution(gameId, roundId, players, hands, riverCards, riverResult?.pots || pots);
  
  return riverResult?.pots || pots;
}

/**
 * Play a single betting round
 */
async function playBettingRound(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  context: string[],
  roundType: string,
  initialBet: number,
  initialPot: number,
  startingPlayer: number,
  pots: Pot[],
  buttonPosition: number
) {
  const bettingRoundId = await createBettingRound(
    gameId,
    roundId,
    roundType as any,
    initialPot
  );
  
  const result = await performBettingRound({
    context,
    highestBet: initialBet,
    pot: initialPot,
    hands,
    gameId,
    roundId,
    bettingRoundId,
    players,
    startingPlayer,
    pots,
    buttonPosition
  });
  
  // Update round pot
  await db.transact(
    db.tx.gameRounds[roundId].update({
      pot: result.pot
    })
  );
  
  return result;
}

/**
 * Update community cards in the database
 */
async function updateCommunityCards(
  gameId: string,
  roundId: string,
  cards: string[]
): Promise<void> {
  await db.transact(
    db.tx.gameRounds[roundId].update({
      communityCards: { cards }
    })
  );
}

/**
 * Handle pot distribution at the end of a round
 */
async function handlePotDistribution(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  communityCards: string[],
  pots: Pot[]
): Promise<void> {
  
  for (const pot of pots) {
    if (pot.amount > 0 && pot.eligiblePlayerIds.length > 0) {
      const showdownPlayers = Object.values(hands)
        .filter(hand => pot.eligiblePlayerIds.includes(hand.playerId))
        .map(hand => ({
          playerId: hand.playerId,
          cards: hand.cards
        }));
      
      await performShowdown({
        showdownPlayers,
        communityCards,
        potAmount: pot.amount,
        gameId,
        roundId,
        players
      });
    }
  }
}

/**
 * Synthesize observations for all players after a round
 */
async function synthesizePlayerObservations(
  gameId: string,
  roundId: string,
  players: Record<string, Player>,
  hands: Record<string, Hand>,
  context: string[],
  communityCards: string[]
): Promise<void> {
  logger.log("Synthesizing player observations", { roundId });
  
  // Get all actions from this round
  const roundData = await db.query({
    gameRounds: {
      $: {
        where: {
          id: roundId
        }
      },
      actions: {
        player: {},
      },
      transactions: {
        player: {},
      }
    }
  });
  
  const round = roundData?.gameRounds?.[0];
  if (!round) return;
  
  // Extract player actions for synthesis
  const playerActions = round.actions?.map((action: any) => ({
    playerId: action.player?.id || '',
    action: action.type,
    reasoning: action.reasoning
  })) || [];
  
  // Calculate winners from transactions
  const winners = round.transactions
    ?.filter((t: any) => t.credit)
    .map((t: any) => ({
      playerId: t.player?.id || '',
      amount: t.amount
    })) || [];
  
  const finalPot = round.pot || 0;
  
  // Synthesize observations for all players in parallel
  const synthesisPromises = Object.entries(players).map(async ([playerId, player]) => {
    try {
      // Get player's current notes
      const playerData = await db.query({
        players: {
          $: {
            where: {
              id: playerId
            }
          }
        }
      });
      
      const existingNotes = playerData?.players?.[0]?.notes;
      const playerHand = Object.values(hands).find(h => h.playerId === playerId);
      
      if (!playerHand) return;
      
      // Synthesize new observations
      const updatedNotes = await synthesizeRoundObservations({
        playerId,
        model: player.model,
        roundContext: context,
        existingNotes,
        myCards: playerHand.cards,
        communityCards,
        finalPot,
        winners,
        playerActions
      });
      
      // Update player notes in database
      await db.transact(
        db.tx.players[playerId].update({
          notes: updatedNotes
        })
      );
      
      logger.log("Updated notes for player", { playerId, notesLength: updatedNotes.length });
    } catch (error) {
      logger.error(`Failed to synthesize observations for player ${playerId}`, { error });
    }
  });
  
  // Wait for all synthesis operations to complete
  await Promise.all(synthesisPromises);
  
  logger.log("Completed synthesizing observations for all players");
} 