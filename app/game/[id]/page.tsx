"use client";

import Card from "../../components/Card";
import { use, useEffect, useState } from "react";
import { init, InstaQLEntity } from "@instantdb/react";
import schema, { AppSchema } from "@/instant.schema";
import NumberFlow from "@number-flow/react";

import {
  CircleNotch,
  ArrowLeft,
  DiamondsFourIcon,
  ChartScatterIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react";
import { calculateEquity, EquityResult } from "poker-odds";
import AnimatedFramedLink from "../../components/AnimatedFramedLink";

import GameSidebar, { CornerBorders } from "../../components/GameSidebar";
import Footer from "../../components/Footer";

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

type hand = {
  player: { id: string }[];
  cards: string[];
};

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gameId } = use(params);

  const { data, isLoading, error } = db.useQuery({
    games: {
      $: {
        where: {
          id: gameId,
        },
      },
      players: {
        actions: {
          gameRound: {},
          bettingRound: {},
        },
        transactions: {},
      },
      gameRounds: {
        bettingRounds: {},
        hands: {
          player: {
            transactions: {},
          },
        },
      },
    },
  });

  const [equity, setEquity] = useState<EquityResult[]>([]);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<
    | (InstaQLEntity<AppSchema, "players"> & {
        transactions: InstaQLEntity<AppSchema, "transactions">[];
        actions?: Array<
          InstaQLEntity<
            AppSchema,
            "actions",
            { bettingRound: object; gameRound: object }
          >
        >;
        notes?: string;
      })
    | null
  >(null);

  useEffect(() => {
    // check if current betting round is not preflop
    if (
      data?.games[0] &&
      data.games[0].gameRounds[data.games[0].gameRounds.length - 1]
        ?.bettingRounds[
        data.games[0].gameRounds[data.games[0].gameRounds.length - 1]
          ?.bettingRounds.length - 1
      ]?.type !== "preflop"
    ) {
      const game = data.games[0];
      const gameRound = game.gameRounds?.[game.gameRounds.length - 1];
      if (!gameRound) return;

      const board = gameRound.communityCards?.cards || [];
      const handsToShow = game.players
        .map((p) => {
          const lastAction = p.actions?.[p.actions.length - 1];
          const lastActionFolded =
            lastAction?.type === "fold" &&
            lastAction?.gameRound?.id === gameRound?.id;
          if (lastActionFolded) {
            return null;
          }
          const hand = gameRound.hands.find(
            (h: InstaQLEntity<AppSchema, "hands", { player: object }>) =>
              h.player[0]?.id === p.id
          );
          return hand?.cards?.cards;
        })
        .filter(Boolean);

      if (handsToShow.length > 1 && handsToShow.every((h) => h.length > 0)) {
        const results = calculateEquity(
          handsToShow as string[][],
          board,
          10000
        );
        setEquity(results);
      } else {
        setEquity([]);
      }
    }
  }, [data]);

  // Auto-refresh to get game updates
  useEffect(() => {
    if (!isAutoRefreshing || !data?.games[0]) return;

    const game = data.games[0];
    const isGameComplete = game.gameRounds?.length >= game.totalRounds;

    if (isGameComplete) {
      setIsAutoRefreshing(false);
      return;
    }

    const interval = setInterval(() => {
      // The query will automatically refetch
      db.queryOnce({
        games: {
          $: {
            where: {
              id: gameId,
            },
          },
          players: {
            actions: {
              gameRound: {},
              bettingRound: {},
            },
            transactions: {},
          },
          gameRounds: {
            bettingRounds: {},
            hands: {
              player: {
                transactions: {},
              },
            },
          },
        },
      });
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoRefreshing, data, gameId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-text-dim font-semibold uppercase">
            Loading Game
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-text-dim font-semibold uppercase">Error</p>
        </div>
      </div>
    );
  }

  if (!data?.games[0]) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-text-dim font-semibold uppercase">
            Game Not Found
          </p>
          <AnimatedFramedLink href="/">
            <ArrowLeft size={16} />
            <p>Back to Home</p>
          </AnimatedFramedLink>
        </div>
      </div>
    );
  }

  // Game exists but no players yet - game is still starting
  if (!data.games[0].players || data.games[0].players.length === 0) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-4">
          <CircleNotch size={24} className="animate-spin text-green-500" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-text-bright font-semibold uppercase">
              Game Starting
            </p>
            <p className="text-xs text-text-dim">
              Setting up players and preparing the table...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const game = data.games[0];

  return (
    <div className="h-dvh bg-dark-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 2xl:p-12">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] mx-auto w-full gap-6">
        <div className="col-span-2">
          <div className="flex flex-col">
            <div className="text-text-medium gap-4 w-full">
              {/* Header */}
              <div className="flex flex-row items-center justify-between col-span-3 mb-2 2xl:mb-4">
                <div className="flex flex-col gap-1 2xl:gap-2">
                  <div className="flex items-center gap-2 2xl:gap-3">
                    <h1 className="text-sm 2xl:text-base font-semibold text-text-bright uppercase">
                      Game{" "}
                      <span className="text-text-dim font-semibold text-xs 2xl:text-sm">
                        #{gameId.slice(-8)}
                      </span>
                    </h1>
                    {game.gameRounds?.length < game.totalRounds && (
                      <div className="flex items-center gap-1.5 text-xs 2xl:text-sm">
                        <div className="w-2 h-2 2xl:w-2.5 2xl:h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 uppercase font-medium">
                          Live
                        </span>
                      </div>
                    )}
                    {game.gameRounds?.length >= game.totalRounds && (
                      <div className="text-xs 2xl:text-sm text-text-dim uppercase">
                        Complete
                      </div>
                    )}
                  </div>
                  <p className="text-xs 2xl:text-sm text-text-dim">
                    Round {game.gameRounds?.length || 0} of{" "}
                    {game.totalRounds || 0}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-2 2xl:gap-3">
                  <AnimatedFramedLink href="/history">
                    <ChartScatterIcon size={16} className="2xl:w-5 2xl:h-5" />
                    <p>History</p>
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

              {/* Game Grid - HUD Style */}
              <div className="grid grid-cols-12 space-x-4 2xl:space-x-6 w-full mt-8">
                <div className="grid grid-cols-3 border border-dark-5 relative col-span-8">
                  <CornerBorders colorClass="border-dark-8" />
                  <Player
                    player={game.players[0]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[0]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 0}
                    button={game.buttonPosition === 0}
                    lastAction={
                      game.players[0]?.actions?.[
                        game.players[0]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                  <Player
                    player={game.players[1]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[1]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 1}
                    button={game.buttonPosition === 1}
                    lastAction={
                      game.players[1]?.actions?.[
                        game.players[1]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                  <Player
                    player={game.players[2]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[2]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 2}
                    button={game.buttonPosition === 2}
                    lastAction={
                      game.players[2]?.actions?.[
                        game.players[2]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                  <Table
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]
                        ?.communityCards.cards
                    }
                    pot={game.gameRounds[game.gameRounds.length - 1]?.pot ?? 0}
                  />
                  <Player
                    player={game.players[5]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[5]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 5}
                    button={game.buttonPosition === 5}
                    lastAction={
                      game.players[5]?.actions?.[
                        game.players[5]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                  <Player
                    player={game.players[4]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[4]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 4}
                    button={game.buttonPosition === 4}
                    lastAction={
                      game.players[4]?.actions?.[
                        game.players[4]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                  <Player
                    player={game.players[3]}
                    cards={
                      game.gameRounds[game.gameRounds.length - 1]?.hands.filter(
                        (hand: hand) =>
                          hand.player[0]?.id === game.players[3]?.id
                      )[0]?.cards.cards
                    }
                    active={game.currentActivePosition === 3}
                    button={game.buttonPosition === 3}
                    lastAction={
                      game.players[3]?.actions?.[
                        game.players[3]?.actions?.length - 1
                      ]
                    }
                    data={data}
                    equity={equity}
                    onSelect={setSelectedPlayer}
                  />
                </div>

                <div className="col-span-4 min-h-full h-0 flex flex-col relative">
                  <CornerBorders colorClass="border-dark-8" />
                  <GameSidebar
                    game={game}
                    selectedPlayer={selectedPlayer}
                    onPlayerSelect={setSelectedPlayer}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="relative h-0 min-h-full">
          <div className="absolute inset-0 overflow-y-auto">
            <GameSidebar
              game={game}
              selectedPlayer={selectedPlayer}
              onPlayerSelect={setSelectedPlayer}
            />
          </div>
        </div> */}
      </div>
      <Footer />
    </div>
  );
}

const Player = ({
  player,
  cards,
  active,
  button,
  lastAction,
  data,
  equity,
  onSelect,
}: {
  player: InstaQLEntity<AppSchema, "players"> & {
    transactions: InstaQLEntity<AppSchema, "transactions">[];
    actions?: Array<
      InstaQLEntity<
        AppSchema,
        "actions",
        { bettingRound: object; gameRound: object }
      >
    >;
    notes?: string;
  };
  cards?: string[];
  active?: boolean;
  button?: boolean;
  lastAction?: InstaQLEntity<
    AppSchema,
    "actions",
    { bettingRound: object; gameRound: object }
  >;
  data: {
    games?: Array<{
      gameRounds?: Array<
        InstaQLEntity<AppSchema, "gameRounds"> & {
          id: string;
          bettingRounds?: Array<
            InstaQLEntity<AppSchema, "bettingRounds"> & { id: string }
          >;
          communityCards?: { cards?: string[] };
        }
      >;
    }>;
  };
  equity: EquityResult[];
  onSelect: (
    player: InstaQLEntity<AppSchema, "players"> & {
      transactions: InstaQLEntity<AppSchema, "transactions">[];
      actions?: Array<
        InstaQLEntity<
          AppSchema,
          "actions",
          { bettingRound: object; gameRound: object }
        >
      >;
      notes?: string;
    }
  ) => void;
}) => {
  if (!player) {
    return <EmptySeat />;
  }

  // Check if this is an empty seat placeholder
  const isEmptySeat = player.name?.toLowerCase().startsWith("empty seat");
  if (isEmptySeat) {
    return <EmptySeat />;
  }

  const lastActionFolded =
    lastAction?.type === "fold" &&
    lastAction?.gameRound?.id ===
      data?.games?.[0]?.gameRounds?.[data.games[0].gameRounds.length - 1]?.id;

  const playerEquity = equity.find(
    (e) =>
      cards &&
      e.hand.length === cards.length &&
      e.hand.every((c) => cards.includes(c))
  );
  const winPercentage = playerEquity
    ? (playerEquity.wins / playerEquity.count) * 100
    : null;

  return (
    <div
      onClick={() => onSelect(player)}
      className={`p-px bg-dark-4 overflow-hidden relative ${
        active ? "border-animation" : ""
      } h-full min-h-[180px] 2xl:min-h-[240px] flex flex-col ${
        lastActionFolded ? "opacity-50" : ""
      } transition-colors cursor-pointer group`}
    >
      <div className="relative grid grid-cols-1 divide-dark-5 flex-1 bg-dark-2 hover:bg-dark-3 transition-colors">
        <div className="flex flex-col lg:flex-row items-start gap-4 2xl:gap-6 justify-between p-4 2xl:p-6 h-full">
          <div className="flex flex-col">
            <div className="text-xs 2xl:text-sm font-semibold text-text-bright capitalize">
              {player?.name}
            </div>
            <div className="flex flex-row items-center gap-1 2xl:gap-1.5 mt-1 2xl:mt-2">
              <DiamondsFourIcon
                size={14}
                className="text-green-500 2xl:w-4 2xl:h-4"
                weight="fill"
              />
              <div className="text-xs 2xl:text-sm text-text-dim">
                <NumberFlow value={player?.stack ?? 0} />
              </div>
            </div>
            {button && (
              <div className="h-2.5 w-2.5 2xl:h-3 2xl:w-3 bg-text-bright mt-2" />
            )}
          </div>
          <div className="flex flex-row items-center gap-1 2xl:gap-2">
            {cards &&
              cards.map((card) => (
                <Card
                  key={card}
                  value={card}
                  className="w-8 h-11 sm:w-8 sm:h-11 2xl:w-12 2xl:h-16"
                />
              ))}
          </div>
        </div>

        <div className="flex flex-col mt-auto">
          {winPercentage !== null && !lastActionFolded && (
            <div>
              <p className="text-xs 2xl:text-sm text-text-dim px-4 2xl:px-6">
                {winPercentage?.toFixed(1)}%
              </p>
              <div className="h-px 2xl:h-0.5 bg-dark-5">
                <div
                  className="h-px 2xl:h-0.5 bg-green-500"
                  style={{ width: `${winPercentage}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col p-4 2xl:p-6 shrink-0 gap-1 2xl:gap-2">
            {lastAction?.reasoning &&
            (
              lastAction as InstaQLEntity<
                AppSchema,
                "actions",
                { bettingRound: object; gameRound: object }
              >
            )?.gameRound?.id ===
              data?.games?.[0]?.gameRounds?.[
                data.games[0].gameRounds.length - 1
              ]?.id ? (
              <>
                <div className="flex flex-row items-center gap-2 2xl:gap-3">
                  <div className="text-xs 2xl:text-sm text-text-medium font-medium uppercase">
                    {lastAction.reasoning?.includes("Posted the small blind")
                      ? "SMALL BLIND"
                      : lastAction.reasoning?.includes("Posted the big blind")
                      ? "BIG BLIND"
                      : lastAction?.type}
                  </div>

                  {Number(lastAction?.amount) > 0 && (
                    <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                      <DiamondsFourIcon
                        size={12}
                        className="text-green-500 2xl:w-4 2xl:h-4"
                        weight="fill"
                      />
                      <div className="text-xs 2xl:text-sm text-text-dim">
                        <NumberFlow value={lastAction?.amount ?? 0} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs 2xl:text-sm text-text-dim font-medium">
                  Hasn&apos;t acted yet
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Table = ({ cards, pot }: { cards: string[]; pot: number }) => {
  const cardSlots = 5;
  const actualCards = cards || [];

  return (
    <div className="border-y border-dark-5 p-8 lg:p-12 2xl:p-16 col-span-3 bg-dark-2 relative">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />
      <div className="flex flex-col items-center justify-center relative z-10 h-40 2xl:h-56">
        {/* Pot display - show placeholder when empty */}
        <div
          className={`flex flex-row items-center gap-1 2xl:gap-2 bg-dark-2 border px-3 py-2 2xl:px-4 2xl:py-3 ${
            Number(pot) > 0 ? "border-dark-6" : "border-dark-5 border-dashed"
          }`}
        >
          <DiamondsFourIcon
            size={14}
            className={`2xl:w-5 2xl:h-5 ${
              Number(pot) > 0 ? "text-green-500" : "text-dark-6"
            }`}
            weight="fill"
          />
          <div
            className={`text-xs 2xl:text-base ${
              Number(pot) > 0 ? "text-text-medium" : "text-dark-6"
            }`}
          >
            {Number(pot) > 0 ? <NumberFlow value={pot} /> : "0"}
          </div>
        </div>

        {/* Card slots - always show 5 placeholders */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 2xl:gap-6 mt-4 2xl:mt-6">
          {Array.from({ length: cardSlots }).map((_, index) => {
            const card = actualCards[index];
            return card ? (
              <Card
                key={card}
                value={card}
                className="w-8 h-11 sm:w-10 sm:h-14 2xl:w-14 2xl:h-20"
              />
            ) : (
              <div
                key={`placeholder-${index}`}
                className="w-8 h-11 sm:w-10 sm:h-14 2xl:w-14 2xl:h-20 border border-dashed border-dark-6 rounded-md bg-dark-3/30"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const EmptySeat = () => {
  return (
    <div className="bg-dark-4 p-px overflow-hidden relative h-full min-h-[180px] 2xl:min-h-[240px] flex flex-col">
      <div className="relative bg-dark-2 flex flex-col flex-1 items-center justify-center">
        <div className="text-xs 2xl:text-sm text-dark-6 uppercase font-medium">
          Empty Seat
        </div>
      </div>
    </div>
  );
};
