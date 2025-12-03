"use client";
import { init } from "@instantdb/react";
import schema from "@/instant.schema";
import {
  CircleNotch,
  ChartScatterIcon,
  GithubLogoIcon,
  ArrowRight,
  DiamondsFourIcon,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import AnimatedFramedLink from "../components/AnimatedFramedLink";
import { CornerBorders } from "../components/GameSidebar";
import Footer from "../components/Footer";

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

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
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-text-dim font-semibold uppercase">
            Loading Game History
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-text-dim font-semibold uppercase">
            Error Loading History
          </p>
          <p className="text-xs text-text-dim">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-dark-1 flex flex-col p-4 sm:p-6 lg:p-8 2xl:p-12">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto w-full flex-1">
        {/* Header */}
        <div className="flex flex-row items-center justify-between mb-4 2xl:mb-6">
          <div className="flex flex-col gap-1 2xl:gap-2">
            <div className="flex items-center gap-2 2xl:gap-3">
              <h1 className="text-sm 2xl:text-base font-semibold text-text-bright uppercase">
                Game History
              </h1>
            </div>
            <p className="text-xs 2xl:text-sm text-text-dim">
              All completed and ongoing poker games
            </p>
          </div>
          <div className="flex flex-row items-center gap-2 2xl:gap-3">
            <AnimatedFramedLink href="/">
              <ChartScatterIcon size={16} className="2xl:w-5 2xl:h-5" />
              <p>New Game</p>
            </AnimatedFramedLink>
            <AnimatedFramedLink
              href="https://github.com/dqnamo/llm-poker"
              target="_blank"
            >
              <GithubLogoIcon size={16} className="2xl:w-5 2xl:h-5" />
              <p>Github</p>
            </AnimatedFramedLink>
          </div>
        </div>

        {/* Games List */}
        <div className="border border-dark-5 relative">
          <CornerBorders colorClass="border-dark-8" />

          {/* Section Header */}
          <div className="bg-dark-3 border-b border-dark-5 p-3 2xl:p-4">
            <h2 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
              All Games
            </h2>
            <p className="text-xs 2xl:text-sm text-text-dim">
              Click on any game to view detailed analysis
            </p>
          </div>

          {/* Table Header */}
          <div className="bg-dark-2 border-b border-dark-5 px-4 py-3 2xl:px-6 2xl:py-4">
            <div className="grid grid-cols-12 gap-4 text-xs 2xl:text-sm text-text-dim font-medium uppercase">
              <div className="col-span-3">Game</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-center">Players</div>
              <div className="col-span-1 text-center">Rounds</div>
              <div className="col-span-2">Winner</div>
              <div className="col-span-2">Loser</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Games */}
          <div className="bg-dark-2 divide-y divide-dark-5">
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
                    className="block hover:bg-dark-3 transition-colors duration-200"
                  >
                    <div className="px-4 py-4 2xl:px-6 2xl:py-5">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Game ID */}
                        <div className="col-span-3">
                          <div className="text-xs 2xl:text-sm font-semibold text-text-bright">
                            Game #{game.id.slice(-8)}
                          </div>
                        </div>

                        {/* Date */}
                        <div className="col-span-2">
                          <div className="text-xs 2xl:text-sm text-text-medium">
                            {gameDate.toLocaleDateString()}
                          </div>
                          <div className="text-xs 2xl:text-sm text-text-dim">
                            {gameDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        {/* Players */}
                        <div className="col-span-1 text-center">
                          <div className="text-xs 2xl:text-sm text-text-medium">
                            <NumberFlow value={totalPlayers} />
                          </div>
                        </div>

                        {/* Rounds */}
                        <div className="col-span-1 text-center">
                          <div className="text-xs 2xl:text-sm text-text-medium">
                            <NumberFlow value={totalRounds} />
                          </div>
                        </div>

                        {/* Winner */}
                        <div className="col-span-2">
                          {biggestWinner ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs 2xl:text-sm font-semibold text-text-medium truncate">
                                {biggestWinner.name}
                              </div>
                              <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                                <CaretUp
                                  size={12}
                                  className="text-green-500 2xl:w-4 2xl:h-4"
                                />
                                <DiamondsFourIcon
                                  size={10}
                                  className="text-green-500 2xl:w-3 2xl:h-3"
                                  weight="fill"
                                />
                                <div className="text-xs 2xl:text-sm text-green-400">
                                  <NumberFlow
                                    value={biggestWinner.totalWinnings}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs 2xl:text-sm text-text-dim">
                              -
                            </div>
                          )}
                        </div>

                        {/* Loser */}
                        <div className="col-span-2">
                          {biggestLoser && biggestLoser.totalWinnings < 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs 2xl:text-sm font-semibold text-text-medium truncate">
                                {biggestLoser.name}
                              </div>
                              <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                                <CaretDown
                                  size={12}
                                  className="text-red-500 2xl:w-4 2xl:h-4"
                                />
                                <DiamondsFourIcon
                                  size={10}
                                  className="text-red-500 2xl:w-3 2xl:h-3"
                                  weight="fill"
                                />
                                <div className="text-xs 2xl:text-sm text-red-400">
                                  <NumberFlow
                                    value={biggestLoser.totalWinnings}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs 2xl:text-sm text-text-dim">
                              -
                            </div>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        <div className="col-span-1 text-right">
                          <ArrowRight
                            size={14}
                            className="text-text-dim 2xl:w-5 2xl:h-5"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex items-center justify-center p-12 2xl:p-16">
                <div className="text-center">
                  <p className="text-xs 2xl:text-sm text-text-dim font-semibold uppercase mb-2">
                    No Games Found
                  </p>
                  <p className="text-xs 2xl:text-sm text-text-dim">
                    Start playing to see your game history here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
