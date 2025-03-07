import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { init, id } from '@instantdb/admin';

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "",
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN || "",
});

export const startGame = task({
  id: "start-game",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 100000, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    const game = await db.transact(db.tx.games[id()].update({
      totalRounds: 100,
    }))
    logger.log("Game created", { game });
  },
});