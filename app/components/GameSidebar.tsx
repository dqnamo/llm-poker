"use client";

import { useState, useMemo } from "react";
import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import NumberFlow from "@number-flow/react";
import {
  CaretUp,
  CaretDown,
  ChartLine,
  Users,
  ArrowLeft,
  DiamondsFourIcon,
} from "@phosphor-icons/react";
import { Reorder, motion } from "motion/react";
import Card from "./Card";

// Color palette for different players
const PLAYER_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#0088FE",
];

type PlayerWithRelations = InstaQLEntity<AppSchema, "players"> & {
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

type PlayerWithWinnings = PlayerWithRelations & { totalWinnings: number };

interface GameSidebarProps {
  game: InstaQLEntity<AppSchema, "games"> & {
    players: PlayerWithRelations[];
    gameRounds?: Array<
      InstaQLEntity<AppSchema, "gameRounds"> & {
        id: string;
        bettingRounds?: Array<
          InstaQLEntity<AppSchema, "bettingRounds"> & { id: string }
        >;
        communityCards?: { cards?: string[] };
        hands: Array<
          InstaQLEntity<AppSchema, "hands"> & {
            player: { id: string }[];
            cards: { cards: string[] };
          }
        >;
      }
    >;
  };
  selectedPlayer: PlayerWithRelations | null;
  onPlayerSelect: (player: PlayerWithRelations | null) => void;
}

export const CornerBorders = ({
  colorClass = "border-dark-5",
  size = 3,
}: {
  colorClass?: string;
  size?: number;
}) => {
  return (
    <>
      <div
        className={`border-r-${size} border-t-${size} ${colorClass} h-${size} w-${size} absolute -top-1 -right-1 transition-opacity duration-300`}
      />
      <div
        className={`border-l-${size} border-b-${size} ${colorClass} h-${size} w-${size} absolute -bottom-1 -left-1 transition-opacity duration-300`}
      />
      <div
        className={`border-l-${size} border-t-${size} ${colorClass} h-${size} w-${size} absolute -top-1 -left-1 transition-opacity duration-300`}
      />
      <div
        className={`border-r-${size} border-b-${size} ${colorClass} h-${size} w-${size} absolute -bottom-1 -right-1 transition-opacity duration-300`}
      />
    </>
  );
};

export default function GameSidebar({
  game,
  selectedPlayer,
  onPlayerSelect,
}: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "players">(
    "players"
  );

  // Process transaction data for the chart
  const chartData = useMemo(() => {
    if (!game) return [];

    const allTransactions: Array<{
      playerId: string;
      playerName: string;
      amount: number;
      credit: boolean;
      createdAt: Date;
      runningBalance: number;
    }> = [];

    // Collect all transactions from all players
    game.players?.forEach((player) => {
      let runningBalance = 0;

      // Sort transactions by createdAt
      const sortedTransactions = [...(player.transactions || [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      sortedTransactions.forEach((transaction) => {
        // Update running balance
        runningBalance += transaction.credit
          ? transaction.amount
          : -transaction.amount;

        allTransactions.push({
          playerId: player.id,
          playerName: player.name,
          amount: transaction.amount,
          credit: transaction.credit,
          createdAt: new Date(transaction.createdAt),
          runningBalance,
        });
      });
    });

    // Sort all transactions by time
    allTransactions.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Create time series data points
    const timeSeriesMap = new Map<number, Record<string, unknown>>();
    const playerBalances = new Map<string, number>();

    // Initialize all players with 0 balance
    game.players?.forEach((player) => {
      playerBalances.set(player.id, 0);
    });

    allTransactions.forEach((transaction) => {
      const timestamp = transaction.createdAt.getTime();

      // Update the balance for this player
      playerBalances.set(transaction.playerId, transaction.runningBalance);

      // Create a data point with all player balances at this time
      const dataPoint: Record<string, unknown> = {
        time: timestamp,
        timestamp: transaction.createdAt.toLocaleString(),
      };

      // Add all player balances to this data point
      game.players?.forEach((player) => {
        dataPoint[player.name] = playerBalances.get(player.id) || 0;
      });

      timeSeriesMap.set(timestamp, dataPoint);
    });

    // Convert to array and sort by time
    return Array.from(timeSeriesMap.values()).sort(
      (a, b) => (a.time as number) - (b.time as number)
    );
  }, [game]);

  const tabs = [
    {
      id: "analytics" as const,
      label: "Analytics",
      icon: ChartLine,
      iconColorClass: "text-orange-500",
    },
    {
      id: "players" as const,
      label: "Players",
      icon: Users,
      iconColorClass: "text-sky-500",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-dark-2 border border-dark-5 relative">
      <CornerBorders colorClass="border-dark-10" />
      {/* Tab Navigation */}
      <div className="relative flex bg-dark-3 border-b border-dark-5 p-1 2xl:p-1.5">
        {/* Animated sliding background */}
        <motion.div
          className="absolute top-1 bottom-1 2xl:top-1.5 2xl:bottom-1.5 bg-dark-5"
          layoutId="sidebar-tab-indicator"
          style={{
            left: activeTab === "analytics" ? "4px" : "50%",
            right: activeTab === "analytics" ? "50%" : "4px",
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 2xl:gap-3 px-2 py-2 2xl:px-3 2xl:py-3 text-xs 2xl:text-sm font-medium uppercase transition-colors ${
              activeTab === tab.id
                ? "text-text-bright"
                : "text-text-dim hover:text-text-medium"
            }`}
          >
            <tab.icon
              size={14}
              className={`2xl:w-5 2xl:h-5 ${tab.iconColorClass}`}
            />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto flex-1">
        {activeTab === "analytics" && (
          <AnalyticsTab game={game} chartData={chartData} />
        )}
        {activeTab === "players" && (
          <PlayersTab
            players={game.players}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={onPlayerSelect}
            game={game}
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({
  game,
  chartData,
}: {
  game: GameSidebarProps["game"];
  chartData: Record<string, unknown>[];
}) {
  return (
    <div className="space-y-0">
      {/* Chart */}
      <div className="bg-dark-2 border-b border-dark-5 relative">
        <div className="p-3 2xl:p-4 border-b border-dark-5">
          <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
            Balances Over Time
          </h3>
          <p className="text-xs 2xl:text-sm text-text-dim">
            Player performance
          </p>
        </div>
        <div className="p-3 2xl:p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={200}
              className="2xl:!h-[280px]"
            >
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-5)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="var(--dark-6)"
                  tick={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--dark-6)"
                  fontSize={8}
                  tick={{ fill: "var(--text-dim)" }}
                  tickFormatter={(value) => `¤${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--dark-2)",
                    border: "1px solid var(--dark-5)",
                    borderRadius: "0px",
                    fontSize: "10px",
                  }}
                  labelStyle={{ color: "var(--text-dim)", fontSize: "9px" }}
                  formatter={(value: number, name: string) => [
                    <span
                      key={`${name}-${value}`}
                      className="flex items-center gap-1 text-text-medium"
                    >
                      <span className="text-green-500">¤</span>
                      <NumberFlow value={value} />
                    </span>,
                    name,
                  ]}
                />

                {game.players?.map((player, index) => (
                  <Line
                    key={player.id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 2xl:h-40">
              <p className="text-xs 2xl:text-sm text-text-dim">
                No data available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game Stats */}
      <div className="space-y-0">
        <div className="bg-dark-2 border-b border-dark-5 relative">
          <div className="p-3 2xl:p-4 border-b border-dark-5">
            <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
              Game Details
            </h3>
          </div>
          <div className="p-3 2xl:p-4 space-y-2 2xl:space-y-3">
            <div className="flex justify-between text-xs 2xl:text-sm">
              <span className="text-text-dim">Total Rounds</span>
              <span className="text-text-medium">
                <NumberFlow value={game.gameRounds?.length || 0} />
              </span>
            </div>
            <div className="flex justify-between text-xs 2xl:text-sm">
              <span className="text-text-dim">Players</span>
              <span className="text-text-medium">
                <NumberFlow value={game.players?.length || 0} />
              </span>
            </div>
            <div className="flex justify-between text-xs 2xl:text-sm">
              <span className="text-text-dim">Created</span>
              <span className="text-text-medium">
                {new Date(game.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-dark-2 border-b border-dark-5 relative">
          <div className="p-3 2xl:p-4 border-b border-dark-5">
            <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
              Transaction Summary
            </h3>
          </div>
          <div className="p-3 2xl:p-4 space-y-2 2xl:space-y-3">
            {(() => {
              const allTransactions =
                game.players?.flatMap((p) => p.transactions || []) || [];
              const totalCredits = allTransactions
                .filter((t) => t.credit)
                .reduce((sum, t) => sum + t.amount, 0);
              const totalDebits = allTransactions
                .filter((t) => !t.credit)
                .reduce((sum, t) => sum + t.amount, 0);

              return (
                <>
                  <div className="flex justify-between text-xs 2xl:text-sm">
                    <span className="text-text-dim">Total Credits</span>
                    <div className="flex items-center gap-1 2xl:gap-1.5">
                      <DiamondsFourIcon
                        size={10}
                        className="text-green-500 2xl:w-3 2xl:h-3"
                        weight="fill"
                      />
                      <span className="text-text-medium">
                        <NumberFlow value={totalCredits} />
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs 2xl:text-sm">
                    <span className="text-text-dim">Total Debits</span>
                    <div className="flex items-center gap-1 2xl:gap-1.5">
                      <DiamondsFourIcon
                        size={10}
                        className="text-red-500 2xl:w-3 2xl:h-3"
                        weight="fill"
                      />
                      <span className="text-red-400">
                        <NumberFlow value={totalDebits} />
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs 2xl:text-sm">
                    <span className="text-text-dim">Transactions</span>
                    <span className="text-text-medium">
                      <NumberFlow value={allTransactions.length} />
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayersTab({
  players,
  selectedPlayer,
  onPlayerSelect,
  game,
}: {
  players?: PlayerWithRelations[];
  selectedPlayer: PlayerWithRelations | null;
  onPlayerSelect: (player: PlayerWithRelations | null) => void;
  game: GameSidebarProps["game"];
}) {
  const [rankedPlayers, setRankedPlayers] = useState<PlayerWithWinnings[]>([]);

  useMemo(() => {
    if (players) {
      const sortedPlayers = players
        // Filter out empty seat placeholders
        .filter(
          (player) => !player.name?.toLowerCase().startsWith("empty seat")
        )
        .map((player) => {
          const totalWinnings = player.transactions.reduce((acc, tx) => {
            return acc + (tx.credit ? tx.amount : -tx.amount);
          }, 0);
          return { ...player, totalWinnings };
        })
        .sort((a, b) => b.totalWinnings - a.totalWinnings);
      setRankedPlayers(sortedPlayers);
    }
  }, [players]);

  // If a player is selected, show their details
  if (selectedPlayer) {
    // Get current hand cards
    const currentHand = game.gameRounds?.[
      game.gameRounds.length - 1
    ]?.hands.find((h) => h.player[0]?.id === selectedPlayer.id);

    // Get all actions for this player across all game rounds
    const playerActions = selectedPlayer.actions || [];
    const gameRounds = game.gameRounds || [];

    // Group actions by game round
    const actionsByRound = gameRounds
      .map((round) => {
        const roundActions = playerActions.filter(
          (action) => action.gameRound?.id === round.id
        );
        return {
          round,
          actions: roundActions,
        };
      })
      .filter((group) => group.actions.length > 0);

    // Calculate total winnings
    const totalWinnings =
      selectedPlayer.transactions?.reduce((acc, tx) => {
        return acc + (tx.credit ? tx.amount : -tx.amount);
      }, 0) || 0;

    return (
      <div className="relative h-full overflow-y-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-2 2xl:gap-3 p-3 2xl:p-4 border-b border-dark-5 bg-dark-3">
          <button
            onClick={() => onPlayerSelect(null)}
            className="text-text-dim hover:text-text-medium transition-colors"
          >
            <ArrowLeft size={14} className="2xl:w-5 2xl:h-5" />
          </button>
          <h3 className="text-xs 2xl:text-sm font-semibold uppercase text-text-bright">
            {selectedPlayer.name}
          </h3>
        </div>

        <div className="relative">
          {/* Current Status */}
          <div className="p-3 2xl:p-4 border-b border-dark-5">
            <div className="grid grid-cols-2 gap-4 2xl:gap-6">
              {/* Stack */}
              <div className="text-center">
                <div className="text-xs 2xl:text-sm text-text-dim uppercase mb-1 2xl:mb-2">
                  Stack
                </div>
                <div className="flex items-center justify-center gap-1 2xl:gap-1.5">
                  <DiamondsFourIcon
                    size={12}
                    className="text-green-500 2xl:w-4 2xl:h-4"
                    weight="fill"
                  />
                  <span className="text-sm 2xl:text-base font-semibold text-text-medium">
                    <NumberFlow value={selectedPlayer.stack ?? 0} />
                  </span>
                </div>
              </div>

              {/* Total Winnings */}
              <div className="text-center">
                <div className="text-xs 2xl:text-sm text-text-dim uppercase mb-1 2xl:mb-2">
                  Winnings
                </div>
                <div className="flex items-center justify-center gap-1 2xl:gap-1.5">
                  {totalWinnings >= 0 ? (
                    <>
                      <CaretUp
                        size={12}
                        className="text-green-500 2xl:w-4 2xl:h-4"
                      />
                      <span className="text-sm 2xl:text-base font-semibold text-green-400">
                        <NumberFlow value={totalWinnings} />
                      </span>
                    </>
                  ) : (
                    <>
                      <CaretDown
                        size={12}
                        className="text-red-500 2xl:w-4 2xl:h-4"
                      />
                      <span className="text-sm 2xl:text-base font-semibold text-red-400">
                        <NumberFlow value={Math.abs(totalWinnings)} />
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Current Hand */}
            {currentHand?.cards?.cards &&
              currentHand.cards.cards.length > 0 && (
                <div className="mt-4 2xl:mt-6">
                  <div className="text-xs 2xl:text-sm text-text-dim uppercase text-center mb-2">
                    Current Hand
                  </div>
                  <div className="flex justify-center gap-1 2xl:gap-2">
                    {currentHand.cards.cards.map((card: string) => (
                      <Card
                        key={card}
                        value={card}
                        className="w-6 h-8 2xl:w-8 2xl:h-11"
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* AI Notes/Observations */}
          {selectedPlayer.notes && (
            <div className="p-3 2xl:p-4 border-b border-dark-5">
              <h4 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright mb-2 2xl:mb-3">
                AI Observations
              </h4>
              <div className="bg-dark-3 border border-dark-5 p-3 2xl:p-4 relative">
                <CornerBorders />
                <p className="text-xs 2xl:text-sm text-text-dim leading-relaxed whitespace-pre-wrap">
                  {selectedPlayer.notes}
                </p>
              </div>
            </div>
          )}

          {/* Action Timeline */}
          <div className="p-3 2xl:p-4 overflow-y-auto">
            <h4 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright mb-3 2xl:mb-4">
              Action Timeline
            </h4>

            <div className="space-y-2 2xl:space-y-3">
              {[...actionsByRound].reverse().map((roundGroup, roundIndex) => (
                <div
                  key={roundGroup.round.id}
                  className="bg-dark-3 border border-dark-5 relative"
                >
                  <CornerBorders />
                  <div className="p-3 2xl:p-4">
                    <div className="flex items-center gap-2 2xl:gap-3 mb-3 2xl:mb-4">
                      <span className="text-xs 2xl:text-sm font-medium uppercase text-text-dim">
                        Round {actionsByRound.length - roundIndex}
                      </span>
                      {roundGroup.round.communityCards?.cards &&
                        roundGroup.round.communityCards.cards.length > 0 && (
                          <div className="flex gap-1 2xl:gap-1.5">
                            {roundGroup.round.communityCards.cards.map(
                              (card: string) => (
                                <Card
                                  key={card}
                                  value={card}
                                  className="w-4 h-5 2xl:w-5 2xl:h-7"
                                />
                              )
                            )}
                          </div>
                        )}
                    </div>

                    <div className="space-y-3 2xl:space-y-4">
                      {roundGroup.actions.map((action) => (
                        <div key={action.id} className="space-y-2">
                          <div className="flex items-center gap-2 2xl:gap-3">
                            <span className="text-xs 2xl:text-sm text-text-medium uppercase font-medium">
                              {action.type}
                            </span>
                            {action.amount > 0 && (
                              <div className="flex items-center gap-1 2xl:gap-1.5">
                                <DiamondsFourIcon
                                  size={10}
                                  className="text-green-500 2xl:w-3 2xl:h-3"
                                  weight="fill"
                                />
                                <span className="text-xs 2xl:text-sm text-text-dim">
                                  <NumberFlow value={action.amount} />
                                </span>
                              </div>
                            )}
                            <span className="text-xs 2xl:text-sm text-text-dim/60">
                              {action.bettingRound?.type || "Unknown"}
                            </span>
                          </div>

                          {action.reasoning && (
                            <div>
                              <div className="text-xs 2xl:text-sm text-text-dim/60 mb-1">
                                Reasoning:
                              </div>
                              <p className="text-xs 2xl:text-sm text-text-dim leading-relaxed">
                                {action.reasoning}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {actionsByRound.length === 0 && (
                <div className="flex items-center justify-center py-8 2xl:py-12">
                  <p className="text-xs 2xl:text-sm text-text-dim">
                    No actions recorded yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show player list
  if (!players) {
    return (
      <div className="flex items-center justify-center h-40 2xl:h-52">
        <p className="text-xs 2xl:text-sm text-text-dim">
          No player data available
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-3 2xl:p-4 border-b border-dark-5">
        <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
          Players
        </h3>
        <p className="text-xs 2xl:text-sm text-text-dim">
          Click to view details
        </p>
      </div>

      <Reorder.Group
        as="div"
        axis="y"
        values={rankedPlayers}
        onReorder={setRankedPlayers}
        className="divide-y divide-dark-5"
      >
        {rankedPlayers.map((player) => (
          <Reorder.Item key={player.id} value={player}>
            <button
              onClick={() => onPlayerSelect(player)}
              className="w-full flex items-center justify-between p-3 2xl:p-4 bg-dark-2 hover:bg-dark-3 transition-colors text-left"
            >
              <div className="text-xs 2xl:text-sm font-semibold text-text-medium">
                {player.name}
              </div>
              <div className="flex items-center gap-1 2xl:gap-1.5">
                {player.totalWinnings > 0 && (
                  <>
                    <CaretUp
                      size={14}
                      className="text-green-500 2xl:w-5 2xl:h-5"
                    />
                    <div className="text-xs 2xl:text-sm text-green-400">
                      <NumberFlow value={player.totalWinnings ?? 0} />
                    </div>
                  </>
                )}
                {player.totalWinnings < 0 && (
                  <>
                    <CaretDown
                      size={14}
                      className="text-red-500 2xl:w-5 2xl:h-5"
                    />
                    <div className="text-xs 2xl:text-sm text-red-400">
                      <NumberFlow value={player.totalWinnings ?? 0} />
                    </div>
                  </>
                )}
                {player.totalWinnings === 0 && (
                  <div className="text-xs 2xl:text-sm text-text-dim">
                    <NumberFlow value={0} />
                  </div>
                )}
              </div>
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
