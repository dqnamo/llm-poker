// Round management logic

import { logger } from './logger';
import { id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { Hand, Player, Pot } from './types';
import { GAME_CONFIG } from './constants';
import { db, clearActivePosition } from './game-setup';
import { performBettingRound, createBettingRound } from './betting-round';
import { performShowdown } from './showdown';
import { synthesizeRoundObservations, AIProvider } from './ai-player';
import { 
  getPlayerPosition, 
  getPlayerIdAtPosition,
  getNextNonEmptySeat,
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
  buttonPosition = 0,
  apiKey,
  provider = 'openrouter'
}: {
  gameId: string;
  players: Record<string, Player>;
  deck: string[];
  roundNumber?: number;
  buttonPosition?: number;
  apiKey?: string;
  provider?: AIProvider;
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
    pots,
    apiKey,
    provider
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
    deck.slice(-5), // Get the community cards (last 5 cards dealt)
    apiKey,
    provider
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
  
  // Find the next non-empty seats for blinds
  // Small blind is the first non-empty seat after the button
  const smallBlindPosition = getNextNonEmptySeat(
    players, 
    (buttonPosition + 1) % GAME_CONFIG.PLAYER_COUNT, 
    GAME_CONFIG.PLAYER_COUNT
  );
  
  // Big blind is the first non-empty seat after the small blind
  const bigBlindPosition = getNextNonEmptySeat(
    players,
    (smallBlindPosition + 1) % GAME_CONFIG.PLAYER_COUNT,
    GAME_CONFIG.PLAYER_COUNT
  );
  
  const smallBlindPlayerId = getPlayerIdAtPosition(players, smallBlindPosition);
  const bigBlindPlayerId = getPlayerIdAtPosition(players, bigBlindPosition);
  
  // Create initial betting round for blinds
  const bettingRoundId = await createBettingRound(gameId, roundId, 'preflop', 0);
  
  // Find the hands for blind players (guaranteed to be non-empty seats)
  const smallBlindHand = Object.values(hands).find(h => h.playerId === smallBlindPlayerId);
  const bigBlindHand = Object.values(hands).find(h => h.playerId === bigBlindPlayerId);
  
  if (!smallBlindHand || !bigBlindHand) {
    logger.error("Could not find hands for blind players", { 
      smallBlindPlayerId, 
      bigBlindPlayerId,
      handsCount: Object.keys(hands).length 
    });
    return 0;
  }
  
  // Post small blind
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
  
  // Post big blind
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
 * Deal hole cards to all players (skipping empty seats)
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
    const player = players[playerId];
    
    // Skip empty seats - they don't get dealt cards
    if (player.model === 'empty') {
      logger.log("Skipping card deal for empty seat", { playerId });
      
      // Create a folded hand for the empty seat so they're tracked but inactive
      const handId = id();
      await db.transact(
        db.tx.hands[handId].update({
          cards: { cards: [] },
          folded: true,
          createdAt: DateTime.now().toISO(),
        }).link({
          game: gameId,
          gameRound: roundId,
          player: playerId
        })
      );
      
      // Create folded hand object
      hands[handId] = {
        id: handId,
        playerId,
        cards: [],
        amount: 0,
        folded: true,
        acted: true, // Mark as acted so they're skipped in betting
        stack: 0,
        allIn: false
      };
      
      continue;
    }
    
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
  pots: Pot[],
  apiKey?: string,
  provider: AIProvider = 'openrouter'
): Promise<Pot[]> {
  
  // Find small blind and big blind positions (same logic as posting blinds)
  const smallBlindPosition = getNextNonEmptySeat(
    players, 
    (buttonPosition + 1) % GAME_CONFIG.PLAYER_COUNT, 
    GAME_CONFIG.PLAYER_COUNT
  );
  
  const bigBlindPosition = getNextNonEmptySeat(
    players,
    (smallBlindPosition + 1) % GAME_CONFIG.PLAYER_COUNT,
    GAME_CONFIG.PLAYER_COUNT
  );
  
  // Preflop starts with first non-empty seat after big blind (UTG)
  const preFlopStart = getNextNonEmptySeat(
    players,
    (bigBlindPosition + 1) % GAME_CONFIG.PLAYER_COUNT,
    GAME_CONFIG.PLAYER_COUNT
  );
  
  // Post-flop starts with small blind (first non-empty seat after button)
  const postFlopStart = smallBlindPosition;
  
  // Track cumulative pot across all betting rounds
  let cumulativePot = 0;
  
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
    buttonPosition,
    apiKey,
    cumulativePot,
    provider
  );
  
  cumulativePot += preflopResult.pot;
  
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
    buttonPosition,
    apiKey,
    cumulativePot,
    provider
  );
  
  cumulativePot += flopResult.pot;
  
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
    buttonPosition,
    apiKey,
    cumulativePot,
    provider
  );
  
  cumulativePot += turnResult.pot;
  
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
    buttonPosition,
    apiKey,
    cumulativePot,
    provider
  );
  
  cumulativePot += riverResult.pot;
  
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
  buttonPosition: number,
  apiKey?: string,
  cumulativePot: number = 0,
  provider: AIProvider = 'openrouter'
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
    buttonPosition,
    apiKey,
    provider
  });
  
  // Update round pot with cumulative total
  const totalPot = cumulativePot + result.pot;
  await db.transact(
    db.tx.gameRounds[roundId].update({
      pot: totalPot
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
  communityCards: string[],
  apiKey?: string,
  provider: AIProvider = 'openrouter'
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
      // Skip empty seats - they don't get observations
      if (player.model === 'empty') {
        logger.log("Skipping observation synthesis for empty seat", { playerId });
        return;
      }
      
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
        playerActions,
        apiKey,
        provider
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