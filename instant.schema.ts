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
    }),
    players: i.entity({
      name: i.string(),
      stack: i.number(),
      status: i.string(),
      cards: i.json(),
    }),
    hands: i.entity({
      roundNumber: i.number(),
      communityCards: i.json(),
      pot: i.number(),
    }),
  },
  links: {
    gameRound: {
      forward: { on: "games", has: "one", label: "hand" },
      reverse: { on: "hands", has: "many", label: "game" }
    },
    gamePlayer: {
      forward: { on: "games", has: "many", label: "player" },
      reverse: { on: "players", has: "many", label: "game" }
    },
    playerHand: {
      forward: { on: "players", has: "one", label: "hand" },
      reverse: { on: "hands", has: "many", label: "player" }
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
