import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { init, id } from '@instantdb/admin';
import { DateTime } from "luxon";
import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Hand } from 'pokersolver';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});


const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "",
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN || "",
});

// Shuffle the deck in place
function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const startGame = task({
  id: "start-game",
  retry: {
    maxAttempts: 1,
  },
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 100000, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    let deck = ["Ac", "Kc", "Qc", "Jc", "Tc", "9c", "8c", "7c", "6c", "5c", "4c", "3c", "2c", "Ah", "Kh", "Qh", "Jh", "Th", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h", "Ad", "Kd", "Qd", "Jd", "Td", "9d", "8d", "7d", "6d", "5d", "4d", "3d", "2d", "As", "Ks", "Qs", "Js", "Ts", "9s", "8s", "7s", "6s", "5s", "4s", "3s", "2s"];
    shuffle(deck); // Shuffle the deck in place

    const gameId = id();
    const game = await db.transact(db.tx.games[gameId].update({
      totalRounds: 100,
      createdAt: DateTime.now().toISO(),
      buttonPosition: 0,
      currentActivePosition: 3,
      deck: { cards: deck },
    }))
    logger.log("Game created", { game });

    const models = ["google/gemini-2.0-flash-001", "google/gemini-2.5-pro", "anthropic/claude-sonnet-4", "openai/gpt-4.1", "openai/o4-mini", "x-ai/grok-3-beta"]
    const players: { [key: string]: { id: string, cards: string[], stack: number, model: string } } = {};
    // 6.times
    for (let i = 0; i < 6; i++) {
      const playerId = id();
      const player = await db.transact(db.tx.players[playerId].update({
        name: models[i],
        stack: Number(process.env.INITIAL_STACK) || 2000,
        status: "active",
        model: models[i],
        createdAt: DateTime.now().toISO(),
      }).link({ game: gameId }))
      logger.log("Player created", { player });
      players[playerId] = { id: playerId, cards: [], stack: Number(process.env.INITIAL_STACK) || 2000, model: models[i] }
    }

    // Play the first round
    for (let i = 0; i < Number(process.env.HANDS_PER_GAME) || 50; i++) {
      const buttonPosition = i % 6;
      const activePosition = (buttonPosition + 4) % 6;
      
      deck = ["Ac", "Kc", "Qc", "Jc", "Tc", "9c", "8c", "7c", "6c", "5c", "4c", "3c", "2c", "Ah", "Kh", "Qh", "Jh", "Th", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h", "Ad", "Kd", "Qd", "Jd", "Td", "9d", "8d", "7d", "6d", "5d", "4d", "3d", "2d", "As", "Ks", "Qs", "Js", "Ts", "9s", "8s", "7s", "6s", "5s", "4s", "3s", "2s"];
      shuffle(deck);

      // wait 3 seconds
      await wait.for({ seconds: 3 });

      await db.transact(db.tx.games[gameId].update({
        buttonPosition: buttonPosition,
        currentActivePosition: activePosition,
        deck: { cards: deck },
      }))

      // check if any player has no more money
      const playersWithNoMoney = Object.values(players).filter(player => player.stack <= 0);
      for(const player of playersWithNoMoney) {
        await db.transact(db.tx.players[player.id].update({
          stack: Number(process.env.INITIAL_STACK) || 2000,
        }))

        players[player.id].stack = Number(process.env.INITIAL_STACK) || 2000;
      }

      await performRound({ gameId, players, deck, roundNumber: i + 1, buttonPosition });
    }

    // Optionally, loop for more rounds here
  },
});

export const performRound = async ({ gameId, players, deck, roundNumber = 1, buttonPosition = 0 }: { gameId: string, players: { [key: string]: { id: string, cards: string[], stack: number, model: string } }, deck: string[], roundNumber?: number, buttonPosition?: number }) => {
  const hands: { [key: string]: { id: string, playerId: string, cards: string[], folded: boolean, amount: number, acted: boolean, stack: number, allIn: boolean } } = {};

  // wait 2 seconds
  

  // start round
  const roundId = id();
  const round = await db.transact(db.tx.gameRounds[roundId].update({
    roundNumber,
    communityCards: { cards: [] },
    pot: 0,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId }))
  logger.log("Round created", { round });

  const context: string[] = [];

  // post the blinds
  const smallBlindPlayer = Object.keys(players)[(buttonPosition + 1) % 6];
  const bigBlindPlayer = Object.keys(players)[(buttonPosition + 2) % 6];

  const playerToStartPreFlopPosition = (buttonPosition + 3) % 6;
  const playerToStartPostFlopPosition = (buttonPosition + 1) % 6;

  await db.transact(db.tx.transactions[id()].update({
    amount: 5,
    credit: false,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId, player: smallBlindPlayer }))
  context.push(`player ${smallBlindPlayer} posted the small blind.`);

  await db.transact(db.tx.transactions[id()].update({
    amount: 10,
    credit: false,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId, player: bigBlindPlayer }))
  context.push(`player ${bigBlindPlayer} posted the big blind.`);

  // give a hand to each player
  for (let i = 0; i < Object.keys(players).length; i++) {
    const handId = id();
    const card1 = deck.pop();
    const card2 = deck.pop();
    const hand = await db.transact(db.tx.hands[handId].update({
      cards: { cards: [card1!, card2!] }, // pluck two cards from the deck
      folded: false,
      createdAt: DateTime.now().toISO(),
    }).link({ game: gameId, gameRound: roundId, player: Object.keys(players)[i] }))
    logger.log("Hand created", { hand });
    players[Object.keys(players)[i]].cards = [card1!, card2!];

    hands[handId] = {
      id: handId,
      playerId: Object.keys(players)[i],
      cards: [card1!, card2!],
      amount: 0,
      folded: false,
      acted: false,
      stack: players[Object.keys(players)[i]].stack,
      allIn: false,
    }
  }

  

  // start the first betting round

  const bettingRoundId = id();
  const bettingRound = await db.transact(db.tx.bettingRounds[bettingRoundId].update({
    type: "preflop",
    pot: 15,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId }))
  logger.log("Betting round created", { bettingRound });

  const smallBlindHand = Object.values(hands).find((hand) => hand.playerId === smallBlindPlayer);

  await db.transact(db.tx.actions[id()].update({
    type: "bet",
    amount: 5,
    reasoning: "Posted the small bilnd",
    createdAt: DateTime.now().toISO(),
  }).link({game: gameId, gameRound: roundId, player: smallBlindPlayer, hand: smallBlindHand?.id, bettingRound: bettingRoundId}))

  
  if(smallBlindHand) {
    const newStack = players[smallBlindPlayer].stack - 5;
    await db.transact(db.tx.players[smallBlindHand?.playerId].update({
      stack: newStack,
    }))

    players[smallBlindHand?.playerId].stack = newStack;
    hands[smallBlindHand?.id].amount = 5;
  }

  const bigBlindHand = Object.values(hands).find((hand) => hand.playerId === bigBlindPlayer);
  await db.transact(db.tx.actions[id()].update({
    type: "bet",
    amount: 10,
    reasoning: "Posted the big blind",
    createdAt: DateTime.now().toISO(),
  }).link({game: gameId, gameRound: roundId, player: bigBlindPlayer, hand: bigBlindHand?.id, bettingRound: bettingRoundId}))

  if(bigBlindHand) {
    const newStack = players[bigBlindPlayer].stack - 10;
    await db.transact(db.tx.players[bigBlindHand?.playerId].update({
      stack: newStack,
    }))

    players[bigBlindHand?.playerId].stack = newStack;
    hands[bigBlindHand?.id].amount = 10;
  }

  let pots: {
    amount: number,
    eligiblePlayerIds: string[],
  }[] = [
    {
      amount: 0,
      eligiblePlayerIds: []
    }
  ];

  const firstBettingRoundResult = await performBettingRound({ context, hightestBet: 10, pot: 15, hands, gameId, roundId, bettingRoundId, players, startingPlayer: playerToStartPreFlopPosition, pots });
  console.log("firstBettingRoundResult", firstBettingRoundResult);

  // update the pot
  await db.transact(db.tx.gameRounds[roundId].update({
    pot: firstBettingRoundResult?.pot || 0,
  }))

  logger.log("pots", { pots });
  // check if only one player is left
  if(Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length === 1) {
    for(const pot of pots) {
      if(pot.eligiblePlayerIds.length > 0) {
        const showdownPlayers = Object.values(hands).filter(hand => pot.eligiblePlayerIds.includes(hand.playerId));
        const communityCards: string[] = [];
        await performShowdown({showdownPlayers, communityCards, potAmount: pot.amount, gameId, roundId, players});
      }
    }

    // update the game
    await db.transact(db.tx.games[gameId].update({
      currentActivePosition: null,
    }))

    return;
  }

  // start the flop
  // give the community cards
  // wait 2 seconds
  
  const flopCards = deck.slice(0, 3);
  const flop = await db.transact(db.tx.gameRounds[roundId].update({
    communityCards: { cards: flopCards },
  }))
  logger.log("Flop created", { flop });
  context.push(`The flop cards are ${flopCards.join(", ")}.`);

  // start the flop betting round
  const flopBettingRoundId = id();
  const flopBettingRound = await db.transact(db.tx.bettingRounds[flopBettingRoundId].update({
    type: "flop",
    pot: 0,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId }))
  logger.log("Flop betting round created", { flopBettingRound });

  const flopBettingRoundResult = await performBettingRound({ context, hightestBet: 0, pot: 0, hands, gameId, roundId, bettingRoundId: flopBettingRoundId, players, startingPlayer: playerToStartPostFlopPosition, pots });
  console.log("flopBettingRoundResult", flopBettingRoundResult);

  await db.transact(db.tx.gameRounds[roundId].update({
    pot: flopBettingRoundResult?.pot || 0,
  }))

  logger.log("pots", { pots });
  // check if only one player is left
  if(Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length === 1) {
    for(const pot of pots) {
      if(pot.eligiblePlayerIds.length > 0) {
        const showdownPlayers = Object.values(hands).filter(hand => pot.eligiblePlayerIds.includes(hand.playerId));
        const communityCards: string[] = flopCards;
        await performShowdown({showdownPlayers, communityCards, potAmount: pot.amount, gameId, roundId, players});
      }
    }

    // update the game
    await db.transact(db.tx.games[gameId].update({
      currentActivePosition: null,
    }))

    return;
  }

  // start the turn
  // give the community cards
  // wait 2 seconds
  
  const turnCards = deck.pop();
  const turn = await db.transact(db.tx.gameRounds[roundId].update({
    communityCards: { cards: flopCards.concat(turnCards!) },
  }))
  logger.log("Turn created", { turn });
  context.push(`The turn card is ${turnCards}.`);

  // start the turn betting round
  const turnBettingRoundId = id();
  const turnBettingRound = await db.transact(db.tx.bettingRounds[turnBettingRoundId].update({
    type: "turn",
    pot: 0,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId }))
  logger.log("Turn betting round created", { turnBettingRound });

  const turnBettingRoundResult = await performBettingRound({ context: flopBettingRoundResult?.context || [], hightestBet: 0, pot: 0, hands, gameId, roundId, bettingRoundId: turnBettingRoundId, players, startingPlayer: playerToStartPostFlopPosition, pots });
  console.log("turnBettingRoundResult", turnBettingRoundResult);

  await db.transact(db.tx.gameRounds[roundId].update({
    pot: turnBettingRoundResult?.pot || 0,
  }))

  logger.log("pots", { pots });
  // check if only one player is left
  if(Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length === 1) {
    for(const pot of pots) {
      if(pot.eligiblePlayerIds.length > 0) {
        const showdownPlayers = Object.values(hands).filter(hand => pot.eligiblePlayerIds.includes(hand.playerId));
        const communityCards: string[] = flopCards.concat(turnCards!);
        await performShowdown({showdownPlayers, communityCards, potAmount: pot.amount, gameId, roundId, players});
      }
    }

    // update the game
    await db.transact(db.tx.games[gameId].update({
      currentActivePosition: null,
    }))

    return;
  }

  // start the river
  // give the community cards
  // wait 2 seconds
  
  const riverCards = deck.pop();
  const river = await db.transact(db.tx.gameRounds[roundId].update({
    communityCards: { cards: flopCards.concat(turnCards!).concat(riverCards!) },
  }))
  logger.log("River created", { river });
  context.push(`The river card is ${riverCards}.`);

  // start the river betting round
  const riverBettingRoundId = id();
  const riverBettingRound = await db.transact(db.tx.bettingRounds[riverBettingRoundId].update({
    type: "river",
    pot: 0,
    createdAt: DateTime.now().toISO(),
  }).link({ game: gameId, gameRound: roundId }))
  logger.log("River betting round created", { riverBettingRound });

  const riverBettingRoundResult = await performBettingRound({ context: turnBettingRoundResult?.context || [], hightestBet: 0, pot: 0, hands, gameId, roundId, bettingRoundId: riverBettingRoundId, players, startingPlayer: playerToStartPostFlopPosition, pots });
  console.log("riverBettingRoundResult", riverBettingRoundResult);

  await db.transact(db.tx.gameRounds[roundId].update({
    pot: riverBettingRoundResult?.pot || 0,
  }))

  logger.log("pots", { pots });
  // check if only one player is left
  if(Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length === 1) {
    for(const pot of pots) {
      if(pot.eligiblePlayerIds.length > 0) {
        const showdownPlayers = Object.values(hands).filter(hand => pot.eligiblePlayerIds.includes(hand.playerId));
        const communityCards: string[] = flopCards.concat(turnCards!).concat(riverCards!);
        await performShowdown({showdownPlayers, communityCards, potAmount: pot.amount, gameId, roundId, players});
      }
    }

    // update the game
    await db.transact(db.tx.games[gameId].update({
      currentActivePosition: null,
    }))

    return;
  }

  // wait 2 seconds
  

  for(const pot of pots) {
    if(pot.eligiblePlayerIds.length > 0) {
      const showdownPlayers = Object.values(hands).filter(hand => pot.eligiblePlayerIds.includes(hand.playerId));
      const communityCards: string[] = flopCards.concat(turnCards!).concat(riverCards!);
      await performShowdown({showdownPlayers, communityCards, potAmount: pot.amount, gameId, roundId, players});
    }
  }
  


  // start the showdown
  // // the players still in the game are the ones who have not folded
  // const showdownPlayers = Object.values(hands).filter(hand => !hand.folded);
  // console.log("showdownPlayers", showdownPlayers);

  // // get the community cards from the round
  // const communityCards: string[] = flopCards.concat(turnCards!).concat(riverCards!);

  // // build each player's 7-card hand (2 hole + 5 community)
  // const solvedHands = showdownPlayers.map(playerHand => {
  //   const allCards = [...playerHand.cards, ...communityCards];
  //   return {
  //     playerId: playerHand.playerId,
  //     hand: Hand.solve(allCards)
  //   };
  // });

  // // find the winner(s)
  // const winners = Hand.winners(solvedHands.map(h => h.hand));

  // // find which player(s) won
  // const winnerPlayers = solvedHands.filter(h => winners.includes(h.hand));
  // for (const winner of winnerPlayers) {
  //   console.log(`Winner: Player ${winner.playerId}, Hand: ${winner.hand.name}, Description: ${winner.hand.descr}`);
  // }

  // // update the game
  // const pot = riverBettingRoundResult?.pot || 0;
  // const potSplitWithWinner = pot / winnerPlayers.length;

  // for (const winner of winnerPlayers) {
  //   const winnerAmount = potSplitWithWinner;
  //   const winnerReasoning = `The winner is ${winner.playerId} with ${winner.hand.name} ${winner.hand.descr}.`;

  //   await db.transact(db.tx.transactions[id()].update({
  //     amount: winnerAmount,
  //     credit: true,
  //     createdAt: DateTime.now().toISO(),
  //   }).link({ game: gameId, gameRound: roundId, player: winner.playerId }))

  //   await db.transact(db.tx.players[winner.playerId].update({
  //     stack: players[winner.playerId].stack + winnerAmount
  //   }))

  //   players[winner.playerId].stack = players[winner.playerId].stack + winnerAmount;
  // }

  // update the game
  await db.transact(db.tx.games[gameId].update({
    currentActivePosition: null,
  }))

  // Optionally return round results
  return {
    roundId,
    hands,
    context,
  };
}

const generateAction = async ({playerId, cards, bet, context, pot, playerStack, model}: {playerId: string, cards: string[], bet: number, context: string[], pot: number, playerStack: number, model: string}) => {

  let toolsAvailable = null;

  if(bet === 0) {
    toolsAvailable = 
    {
      bet: tool({
        description: 'Bet a certain amount of money',
        parameters: z.object({
          amount: z.number().describe('The amount to bet'),
          reasoning: z.string().describe('The reasoning for the bet'),
        }),
      }),
      check: tool({
        description: 'Check the hand',
        parameters: z.object({
          reasoning: z.string().describe('The reasoning for the fold'),
        }),
      }),
    }
  } else {
    toolsAvailable = 
    {
      bet: tool({
        description: 'Bet a certain amount of money',
        parameters: z.object({
          amount: z.number().describe('The amount to bet'),
          reasoning: z.string().describe('The reasoning for the bet'),
        }),
      }),
      fold: tool({
        description: 'Fold the hand',
        parameters: z.object({
          reasoning: z.string().describe('The reasoning for the fold'),
        }),
      }),
    }
  }

  console.log("model", model);
  const { toolCalls } = await generateText({
    model: openrouter.chat(model),
    prompt: `
      You are a poker player.
      You are in a poker game.
      You are in the first betting round.
      You are the player ${playerId}.
      You are the first to act.

      Here are your cards: ${cards.join(", ")}

      The current bet you need to call is ${bet}.

      The current pot is ${pot}.

      Your current stack is ${playerStack}.

      The minimum bet is 5.

      BETTING RULES:
      - If you choose to bet, you must bet at least ${bet} (the current bet amount)
      - You cannot bet more than ${playerStack} (your current stack)
      - If you don't have enough chips to call ${bet}, you can go all-in with your remaining stack
      - If you have enough chips but bet less than ${bet}, you will be forced to fold
      - If you bet more than ${bet}, you are raising and other players must match your new bet

      Here is the context of the game: ${context.join("\n")}
    `,
    tools: toolsAvailable,
    toolChoice: "required",
  });


  // some validation
  if(toolCalls.length === 0) {
    return [{
      toolName: "fold",
      args: { reasoning: "I didn't do anything. Fold by default" }
    }];
  }

  // Validate the first tool call (assuming single action per turn)
  const toolCall = toolCalls[0];
  
  if(toolCall.toolName === "bet") {
    const betAmount = toolCall.args.amount;
    
    // Validation: Can't bet more than player has in stack
    if(betAmount > playerStack) {
      return [{
        toolName: "fold",
        args: { reasoning: `Cannot bet ${betAmount} - only have ${playerStack} in stack. Forced to fold.` }
      }];
    }
    
    // Validation: Must bet at least the current bet amount
    if(betAmount < bet) {
      return [{
        toolName: "fold",
        args: { reasoning: `Cannot bet ${betAmount} - must bet at least ${bet} to call. Forced to fold.` }
      }];
    }
  }

  return toolCalls;
}


const performBettingRound = async ({context, hightestBet, pot, hands, gameId, roundId, bettingRoundId, players, startingPlayer, pots}: {context: string[], hightestBet: number, pot: number, hands: { [key: string]: { id: string, playerId: string, cards: string[], folded: boolean, amount: number, acted: boolean, allIn: boolean } }, gameId: string, roundId: string, bettingRoundId: string, players: { [key: string]: { cards: string[], stack: number, model: string } }, startingPlayer: number, pots: { amount: number, eligiblePlayerIds: string[] }[]}) => {

    logger.log("pots", { pots });
    let sidePots = []

    // start the first betting round
    for (let i = startingPlayer; i < Object.keys(hands).length;) {


      console.log("hands", hands);
      console.log("current player", hands[Object.keys(hands)[i]]);

      if(hands[Object.keys(hands)[i]].folded) {
        console.log("player folded");
        if(i === Object.keys(hands).length - 1) {
          i = 0;
        } else {
          i++;
        }
        continue;
      }
      

      // change current active position
      await db.transact(db.tx.games[gameId].update({
        currentActivePosition: i,
      }))

      const toolCalls = await generateAction({playerId: hands[Object.keys(hands)[i]].playerId, cards: hands[Object.keys(hands)[i]].cards, bet: hightestBet, context, pot, playerStack: players[hands[Object.keys(hands)[i]].playerId].stack, model: players[hands[Object.keys(hands)[i]].playerId].model});
      console.log(toolCalls);

      const actionId = id();
      // Replace forEach with for...of to ensure async actions complete in order
      for (const toolCall of toolCalls) {
        if(toolCall.toolName === "bet") {
          const betAmount = toolCall.args.amount;
          const playerStack = players[hands[Object.keys(hands)[i]].playerId].stack;
          
          // Additional validation: Ensure player has enough chips
          if(betAmount > playerStack) {
            // If they can't afford the bet, they must fold
            const action = await db.transact(db.tx.actions[actionId].update({
              type: "fold",
              amount: 0,
              createdAt: DateTime.now().toISO(),
              reasoning: `Cannot bet ${betAmount} - only have ${playerStack} in stack. Forced to fold.`,
            }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
            logger.log("Action created", { action });
            hands[Object.keys(hands)[i]].folded = true;
            hands[Object.keys(hands)[i]].acted = true;
            context.push(`${hands[Object.keys(hands)[i]].playerId} folded (insufficient chips).`);
            continue;
          }
          
          // Additional validation: Ensure bet is at least the current bet amount
          if(betAmount < hightestBet) {
            // Check if player can go all-in
            if(playerStack >= hightestBet) {
              // They have enough chips but bet too little - force fold
              const action = await db.transact(db.tx.actions[actionId].update({
                type: "fold",
                amount: 0,
                createdAt: DateTime.now().toISO(),
                reasoning: `Cannot bet ${betAmount} - must bet at least ${hightestBet} to call. Forced to fold.`,
              }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
              logger.log("Action created", { action });
              hands[Object.keys(hands)[i]].folded = true;
              hands[Object.keys(hands)[i]].acted = true;
              context.push(`${hands[Object.keys(hands)[i]].playerId} folded (bet too low).`);
              continue;
            } else {
              // Player doesn't have enough chips - they go all-in
              const allInAmount = playerStack;
              const action = await db.transact(db.tx.actions[actionId].update({
                type: "bet",
                amount: allInAmount,
                reasoning: `Going all-in with ${allInAmount} (cannot afford full bet of ${hightestBet})`,
                createdAt: DateTime.now().toISO(),
              }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
              logger.log("Action created", { action });

              await db.transact(db.tx.transactions[id()].update({
                amount: allInAmount,
                credit: false,
                createdAt: DateTime.now().toISO(),
              }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId}))
              
              const newStack = 0; // All-in
              await db.transact(db.tx.players[hands[Object.keys(hands)[i]].playerId].update({
                stack: newStack,
              }))

              players[hands[Object.keys(hands)[i]].playerId].stack = newStack;

              // Update highest bet if all-in amount is higher
              if(allInAmount > hightestBet) {
                hightestBet = allInAmount;
              }else{
                hands[Object.keys(hands)[i]].allIn = true;
                sidePots.push({
                  amount: allInAmount,
                })
              }

              pot += allInAmount;
              hands[Object.keys(hands)[i]].amount = allInAmount;
              hands[Object.keys(hands)[i]].acted = true;

              if(allInAmount > hightestBet) {
                // make everyone else not acted
                Object.values(hands).forEach(hand => {
                  if(hand.playerId !== hands[Object.keys(hands)[i]].playerId) {
                    hand.acted = false;
                  }
                });
              }

              context.push(`${hands[Object.keys(hands)[i]].playerId} went all-in with ${allInAmount}.`);
              continue;
            }
          }

          const action = await db.transact(db.tx.actions[actionId].update({
            type: "bet",
            amount: betAmount,
            reasoning: toolCall.args.reasoning,
            createdAt: DateTime.now().toISO(),
          }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
          logger.log("Action created", { action });

          await db.transact(db.tx.transactions[id()].update({
            amount: betAmount,
            credit: false,
            createdAt: DateTime.now().toISO(),
          }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId}))
          
          const newStack = playerStack - betAmount;
          await db.transact(db.tx.players[hands[Object.keys(hands)[i]].playerId].update({
            stack: newStack,
          }))

          players[hands[Object.keys(hands)[i]].playerId].stack = newStack;

          hightestBet = betAmount;
          pot += betAmount;
          hands[Object.keys(hands)[i]].amount = betAmount;
          hands[Object.keys(hands)[i]].acted = true;

          if(betAmount > hightestBet) {
            // make everyone else not acted
            Object.values(hands).forEach(hand => {
              if(hand.playerId !== hands[Object.keys(hands)[i]].playerId) {
                hand.acted = false;
              }
            });
          }

          context.push(`${hands[Object.keys(hands)[i]].playerId} bet ${betAmount}.`);
        }
        if(toolCall.toolName === "fold") {
          const action = await db.transact(db.tx.actions[actionId].update({
            type: "fold",
            amount: 0,
            createdAt: DateTime.now().toISO(),
            reasoning: toolCall.args.reasoning,
          }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
          logger.log("Action created", { action });
          hands[Object.keys(hands)[i]].folded = true;
          hands[Object.keys(hands)[i]].acted = true;

          context.push(`${hands[Object.keys(hands)[i]].playerId} folded.`);
        }
        if(toolCall.toolName === "check") {
          const action = await db.transact(db.tx.actions[actionId].update({
            type: "check",
            amount: 0,
            createdAt: DateTime.now().toISO(),
            reasoning: toolCall.args.reasoning,
          }).link({game: gameId, gameRound: roundId, player: hands[Object.keys(hands)[i]].playerId, bettingRound: bettingRoundId, hand: hands[Object.keys(hands)[i]].id}))
          logger.log("Action created", { action });
          hands[Object.keys(hands)[i]].acted = true;

          context.push(`${hands[Object.keys(hands)[i]].playerId} checked.`);
        }
      }


      // check if everyone but one has folded
      if(Object.values(hands).filter(hand => !hand.folded && !hand.allIn).length === 1) {
        // the winner is the only player left
        // make all players to have not acted yet (RESET)
        Object.values(hands).forEach(hand => {
          hand.acted = false;
          hand.amount = 0;
        });

        pots[0].amount = pots[0].amount + pot;
        pots[0].eligiblePlayerIds = Object.values(hands).filter(hand => !hand.folded).map(hand => hand.playerId);

        return {
          context,
          hands,
          pot,
        }
      }

    
      // check if highest bet * number of players who have not folded is equal to the pot. make sure all players have acted
      const allPlayersBetTheSameAmount = Object.values(hands)
        .filter(hand => !hand.folded && !hand.allIn)
        .every(hand => hand.amount === hightestBet && hand.acted);

      console.log("context", context);

      if(allPlayersBetTheSameAmount) {
        // make all players to have not acted yet (RESET)
        Object.values(hands).forEach(hand => {
          hand.acted = false;
          hand.amount = 0;
        });

        let amountOfPlayers = Object.values(hands).filter(hand => !hand.folded).length;
        // check if there are side pots
        for(const sidePot of sidePots) {
          let sidePotAmount = sidePot.amount * amountOfPlayers;
          pot = pot - sidePotAmount;
          pots.push({
            amount: sidePotAmount,
            eligiblePlayerIds: Object.values(hands).filter(hand => !hand.folded).map(hand => hand.playerId),
          })
        }
          

        pots[0].amount = pots[0].amount + pot;
        pots[0].eligiblePlayerIds = Object.values(hands).filter(hand => !hand.folded).map(hand => hand.playerId);
        return {
          context,
          hands,
          pot,
          pots,
        }
      }else{
        console.log("Not all players have bet the same amount");
        console.log("i", i);
        if(i === Object.keys(hands).length - 1) {
          i=0;
        }else{
          i++;
        }
        // await performBettingRound({context, hightestBet, pot, hands, gameId, roundId, bettingRoundId});
      }
    }
}

const performShowdown = async ({showdownPlayers, communityCards, potAmount, gameId, roundId, players}: {showdownPlayers: { playerId: string, cards: string[] }[], communityCards: string[], potAmount: number, gameId: string, roundId: string, players: { [key: string]: { cards: string[], stack: number, model: string } }}) => {

  // build each player's 7-card hand (2 hole + 5 community)
  const solvedHands = showdownPlayers.map(playerHand => {
    const allCards = [...playerHand.cards, ...communityCards];
    return {
      playerId: playerHand.playerId,
      hand: Hand.solve(allCards)
    };
  });

  // find the winner(s)
  const winners = Hand.winners(solvedHands.map(h => h.hand));

  logger.log("winners", { winners });

  // find which player(s) won
  const winnerPlayers = solvedHands.filter(h => winners.includes(h.hand));
  for (const winner of winnerPlayers) {
    logger.log(`Winner: Player ${winner.playerId}, Hand: ${winner.hand.name}, Description: ${winner.hand.descr}`);
  }

  logger.log("winnerPlayers", { winnerPlayers });
  logger.log("potAmount", { potAmount });

  // update the game
  const pot = potAmount;
  const potSplitWithWinner = pot / winnerPlayers.length;

  for (const winner of winnerPlayers) {
    const winnerAmount = potSplitWithWinner;
    const winnerReasoning = `The winner is ${winner.playerId} with ${winner.hand.name} ${winner.hand.descr}.`;

    await db.transact(db.tx.transactions[id()].update({
      amount: winnerAmount,
      credit: true,
      createdAt: DateTime.now().toISO(),
    }).link({ game: gameId, gameRound: roundId, player: winner.playerId }))

    await db.transact(db.tx.players[winner.playerId].update({
      stack: players[winner.playerId].stack + winnerAmount
    }))

    players[winner.playerId].stack = players[winner.playerId].stack + winnerAmount;
  }
}