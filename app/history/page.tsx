"use client";
import { init } from "@instantdb/react";
import schema from "@/instant.schema";
import { CircleNotch } from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import Link from "next/link";

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

const CornerBorders = () => {
  return (
    <>
      <div className="border-r-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -right-1" />
      <div className="border-l-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -left-1" />
      <div className="border-l-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -left-1" />
      <div className="border-r-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -right-1" />
    </>
  );
};

export default function HistoryPage() {
  const { data, isLoading, error } = db.useQuery({
    games: {
      $: {
        order: {
          createdAt: "desc",
        },
      },
      players: {
        transactions: {},
      },
      gameRounds: {},
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200  w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-neutral-500 font-semibold uppercase">
            Loading Game History
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200  w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 font-semibold uppercase">
            Error Loading History
          </p>
          <p className="text-xs text-neutral-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-10">
      <div className="text-neutral-200  max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-row items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-semibold uppercase">Game History</h1>
            <p className="text-xs text-neutral-500 max-w-sm">
              All completed and ongoing poker games.
            </p>
          </div>
        </div>

        {/* Games List */}
        <div className="flex flex-col border border-neutral-900 relative">
          <CornerBorders />
          <div className="flex flex-col p-4 border-b border-neutral-900">
            <h2 className="text-xs font-medium uppercase">All Games</h2>
            <p className="text-xs text-neutral-500">
              Click on any game to view detailed analysis
            </p>
          </div>

          {/* Table Header */}
          <div className="bg-neutral-950 border-b border-neutral-900 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-xs text-neutral-500 font-medium uppercase">
              <div className="col-span-3">Game</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-center">Players</div>
              <div className="col-span-1 text-center">Rounds</div>
              <div className="col-span-2">Winner</div>
              <div className="col-span-2">Loser</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          <div className="bg-neutral-950 divide-y divide-neutral-900">
            {data?.games && data.games.length > 0 ? (
              data.games.map((game) => {
                // Calculate game statistics
                const totalPlayers = game.players?.length || 0;
                const totalRounds = game.gameRounds?.length || 0;
                const gameDate = new Date(game.createdAt);

                // Calculate biggest winner/loser
                const playersWithWinnings =
                  game.players?.map((player) => {
                    const totalWinnings =
                      player.transactions?.reduce((acc, tx) => {
                        return acc + (tx.credit ? tx.amount : -tx.amount);
                      }, 0) || 0;
                    return { ...player, totalWinnings };
                  }) || [];

                const sortedPlayers = playersWithWinnings.sort(
                  (a, b) => b.totalWinnings - a.totalWinnings
                );
                const biggestWinner = sortedPlayers[0];
                const biggestLoser = sortedPlayers[sortedPlayers.length - 1];

                return (
                  <Link
                    key={game.id}
                    href={`/analysis/${game.id}`}
                    className="block hover:bg-neutral-900/50 transition-colors duration-200"
                  >
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Game ID */}
                        <div className="col-span-3">
                          <div className="text-sm font-semibold">
                            Game #{game.id.slice(-8)}
                          </div>
                        </div>

                        {/* Date */}
                        <div className="col-span-2">
                          <div className="text-xs text-neutral-400 ">
                            {gameDate.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-neutral-500 ">
                            {gameDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        {/* Players */}
                        <div className="col-span-1 text-center">
                          <div className="text-xs text-neutral-200">
                            <NumberFlow value={totalPlayers} />
                          </div>
                        </div>

                        {/* Rounds */}
                        <div className="col-span-1 text-center">
                          <div className="text-xs text-neutral-200">
                            <NumberFlow value={totalRounds} />
                          </div>
                        </div>

                        {/* Winner */}
                        <div className="col-span-2">
                          {biggestWinner ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs font-semibold truncate">
                                {biggestWinner.name}
                              </div>
                              <div className="flex flex-row items-center gap-1">
                                <div className="text-sm text-lime-500">¤</div>
                                <div className="text-xs text-neutral-200">
                                  <NumberFlow
                                    value={biggestWinner.totalWinnings}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-500">-</div>
                          )}
                        </div>

                        {/* Loser */}
                        <div className="col-span-2">
                          {biggestLoser && biggestLoser.totalWinnings < 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs font-semibold truncate">
                                {biggestLoser.name}
                              </div>
                              <div className="flex flex-row items-center gap-1">
                                <div className="text-sm text-lime-500">¤</div>
                                <div className="text-xs text-red-400">
                                  <NumberFlow
                                    value={biggestLoser.totalWinnings}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-500">-</div>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        <div className="col-span-1 text-right">
                          <div className="text-xs text-neutral-500">→</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <p className="text-xs text-neutral-500 font-semibold uppercase mb-2">
                    No Games Found
                  </p>
                  <p className="text-xs text-neutral-400">
                    Start playing to see your game history here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
