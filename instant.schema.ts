// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.any(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    games: i.entity({
      totalRounds: i.number(),
      deck: i.json(),
      buttonPosition: i.number(),
      createdAt: i.date().indexed(),
      currentActivePosition: i.number().optional(),
      completedAt: i.date().optional(),
      customGame: i.boolean().optional(),
      mainEvent: i.boolean().optional(),
      jobHandleId: i.string().optional(),
    }),
    players: i.entity({
      name: i.string(),
      stack: i.number(),
      status: i.string(),
      createdAt: i.date(),
      model: i.string(),
      seatNumber: i.number().optional(),
      emptySeat: i.boolean().optional(),
      humanPlayer: i.boolean().optional(),
      humanPlayerSessionId: i.string().optional(),
      notes: i.string().optional(),
    }),
    gameRounds: i.entity({
      roundNumber: i.number(),
      communityCards: i.json().optional(),
      pot: i.number().optional(),
      createdAt: i.date(),
    }),
    bettingRounds: i.entity({
      type: i.string(),
      pot: i.number(),
      createdAt: i.date(),
    }),
    hands: i.entity({
      cards: i.json(),
      folded: i.boolean(),
      createdAt: i.date(),
    }),
    actions: i.entity({
      type: i.string(),
      amount: i.number(),
      reasoning: i.string().indexed(),
      createdAt: i.date(),
    }),
    transactions: i.entity({
      amount: i.number(),
      credit: i.boolean().indexed(),
      createdAt: i.date(),
    }),
  },
  links: {
    gameRound: {
      forward: { on: "games", has: "many", label: "gameRounds" },
      reverse: { on: "gameRounds", has: "one", label: "game" }
    },
    gamePlayer: {
      forward: { on: "games", has: "many", label: "players" },
      reverse: { on: "players", has: "one", label: "game" }
    },
    playerHand: {
      forward: { on: "players", has: "one", label: "hand" },
      reverse: { on: "hands", has: "many", label: "player" }
    },
    roundHand: {
      forward: { on: "gameRounds", has: "many", label: "hands" },
      reverse: { on: "hands", has: "one", label: "gameRound" }
    },
    actionPlayer: {
      forward: { on: "actions", has: "one", label: "player" },
      reverse: { on: "players", has: "many", label: "actions" }
    },
    actionGameRound: {
      forward: { on: "actions", has: "one", label: "gameRound" },
      reverse: { on: "gameRounds", has: "many", label: "actions" }
    },
    actionHand: {
      forward: { on: "actions", has: "one", label: "hand" },
      reverse: { on: "hands", has: "many", label: "actions" }
    },
    actionBettingRound: {
      forward: { on: "actions", has: "one", label: "bettingRound" },
      reverse: { on: "bettingRounds", has: "many", label: "actions" }
    },
    bettingRoundGameRound: {
      forward: { on: "bettingRounds", has: "one", label: "gameRound" },
      reverse: { on: "gameRounds", has: "many", label: "bettingRounds" }
    },
    transactionPlayer: {
      forward: { on: "transactions", has: "one", label: "player" },
      reverse: { on: "players", has: "many", label: "transactions" }
    },
    transactionGameRound: {
      forward: { on: "transactions", has: "one", label: "gameRound" },
      reverse: { on: "gameRounds", has: "many", label: "transactions" }
    }
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
