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
  Brain,
  Trophy,
  X,
  DiamondsFourIcon,
} from "@phosphor-icons/react";
import { Reorder } from "motion/react";
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
  const [activeTab, setActiveTab] = useState<
    "analytics" | "thinking" | "rankings"
  >("rankings");

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
    { id: "analytics" as const, label: "Analytics", icon: ChartLine },
    { id: "thinking" as const, label: "Thinking", icon: Brain },
    { id: "rankings" as const, label: "Rankings", icon: Trophy },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-neutral-900/50 rounded-xl border border-neutral-800/50">
      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-medium uppercase transition-colors ${
              activeTab === tab.id
                ? "bg-neutral-800 text-neutral-200 border-b-2 border-neutral-600"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto">
        {activeTab === "analytics" && (
          <AnalyticsTab game={game} chartData={chartData} />
        )}
        {activeTab === "thinking" && (
          <ThinkingTab
            selectedPlayer={selectedPlayer}
            onPlayerSelect={onPlayerSelect}
            game={game}
          />
        )}
        {activeTab === "rankings" && <RankingsTab players={game.players} />}
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
    <div className="p-4 space-y-6">
      {/* Chart */}
      <div className="bg-neutral-950 border border-neutral-800 relative">
        <CornerBorders />
        <div className="p-3 border-b border-neutral-800">
          <h3 className="text-xs font-medium uppercase text-neutral-200">
            Balances Over Time
          </h3>
          <p className="text-xs text-neutral-500">Player performance</p>
        </div>
        <div className="p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#737373"
                  tick={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#737373"
                  fontSize={8}
                  tick={{ fill: "#737373" }}
                  tickFormatter={(value) => `¤${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #262626",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}
                  labelStyle={{ color: "#a3a3a3", fontSize: "9px" }}
                  formatter={(value: number, name: string) => [
                    <span
                      key={`${name}-${value}`}
                      className="flex items-center gap-1 text-neutral-200"
                    >
                      <span className="text-lime-500">¤</span>
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
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-neutral-500">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Game Stats */}
      <div className="space-y-4">
        <div className="bg-neutral-950 border border-neutral-800 relative">
          <CornerBorders />
          <div className="p-3 border-b border-neutral-800">
            <h3 className="text-xs font-medium uppercase text-neutral-200">
              Game Details
            </h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Total Rounds</span>
              <NumberFlow value={game.gameRounds?.length || 0} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Players</span>
              <NumberFlow value={game.players?.length || 0} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Created</span>
              <span>{new Date(game.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 relative">
          <CornerBorders />
          <div className="p-3 border-b border-neutral-800">
            <h3 className="text-xs font-medium uppercase text-neutral-200">
              Transaction Summary
            </h3>
          </div>
          <div className="p-3 space-y-2">
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
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Total Credits</span>
                    <div className="flex items-center gap-1">
                      <DiamondsFourIcon
                        size={10}
                        className="text-green-500"
                        weight="fill"
                      />
                      <NumberFlow value={totalCredits} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Total Debits</span>
                    <div className="flex items-center gap-1">
                      <DiamondsFourIcon
                        size={10}
                        className="text-red-500"
                        weight="fill"
                      />
                      <span className="text-red-400">
                        <NumberFlow value={totalDebits} />
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Transactions</span>
                    <NumberFlow value={allTransactions.length} />
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

function ThinkingTab({
  selectedPlayer,
  onPlayerSelect,
  game,
}: {
  selectedPlayer: PlayerWithRelations | null;
  onPlayerSelect: (player: PlayerWithRelations | null) => void;
  game: GameSidebarProps["game"];
}) {
  if (!selectedPlayer) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Brain size={32} className="text-neutral-600 mb-2" />
          <p className="text-xs text-neutral-500 uppercase font-medium">
            Select a Player
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            Click on any player to view their AI thinking process
          </p>
        </div>
      </div>
    );
  }

  // Get current hand cards
  const currentHand = game.gameRounds?.[game.gameRounds.length - 1]?.hands.find(
    (h) => h.player[0]?.id === selectedPlayer.id
  );

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
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase">
            {selectedPlayer.name}
          </h3>
        </div>
        <button
          onClick={() => onPlayerSelect(null)}
          className="text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative">
        {/* Current Status */}
        <div className="p-4 border-b border-neutral-800">
          <div className="grid grid-cols-2 gap-4">
            {/* Stack */}
            <div className="text-center">
              <div className="text-xs text-neutral-500 uppercase mb-1">
                Stack
              </div>
              <div className="flex items-center justify-center gap-1">
                <DiamondsFourIcon
                  size={12}
                  className="text-green-500"
                  weight="fill"
                />
                <span className="text-sm  font-semibold">
                  <NumberFlow value={selectedPlayer.stack ?? 0} />
                </span>
              </div>
            </div>

            {/* Total Winnings */}
            <div className="text-center">
              <div className="text-xs text-neutral-500 uppercase mb-1">
                Winnings
              </div>
              <div className="flex items-center justify-center gap-1">
                {totalWinnings >= 0 ? (
                  <>
                    <CaretUp size={12} className="text-lime-500" />
                    <span className="text-sm  font-semibold text-lime-300">
                      <NumberFlow value={totalWinnings} />
                    </span>
                  </>
                ) : (
                  <>
                    <CaretDown size={12} className="text-red-500" />
                    <span className="text-sm  font-semibold text-red-300">
                      <NumberFlow value={Math.abs(totalWinnings)} />
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Current Hand */}
          {currentHand?.cards?.cards && currentHand.cards.cards.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-neutral-500 uppercase text-center mb-2">
                Current Hand
              </div>
              <div className="flex justify-center gap-1">
                {currentHand.cards.cards.map((card: string) => (
                  <Card key={card} value={card} className="w-6 h-8" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Notes/Observations */}
        {selectedPlayer.notes && (
          <div className="p-4 border-b border-neutral-800">
            <h4 className="text-xs font-medium uppercase text-neutral-200 mb-2">
              AI Observations
            </h4>
            <div className="bg-neutral-950 border border-neutral-800 p-3 relative">
              <CornerBorders />
              <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {selectedPlayer.notes}
              </p>
            </div>
          </div>
        )}

        {/* Action Timeline */}
        <div className="p-4 overflow-y-auto">
          <h4 className="text-xs font-medium uppercase text-neutral-200 mb-3">
            Action Timeline
          </h4>

          <div className="space-y-4">
            {actionsByRound.reverse().map((roundGroup, roundIndex) => (
              <div
                key={roundGroup.round.id}
                className="bg-neutral-950 border border-neutral-800 relative"
              >
                <CornerBorders />
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium uppercase text-neutral-400">
                      Round {actionsByRound.length - roundIndex}
                    </span>
                    {roundGroup.round.communityCards?.cards &&
                      roundGroup.round.communityCards.cards.length > 0 && (
                        <div className="flex gap-1">
                          {roundGroup.round.communityCards.cards.map(
                            (card: string) => (
                              <Card
                                key={card}
                                value={card}
                                className="w-4 h-5"
                              />
                            )
                          )}
                        </div>
                      )}
                  </div>

                  <div className="space-y-3">
                    {roundGroup.actions.map((action) => (
                      <div key={action.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-200  uppercase font-medium">
                            {action.type}
                          </span>
                          {action.amount > 0 && (
                            <div className="flex items-center gap-1">
                              <DiamondsFourIcon
                                size={10}
                                className="text-green-500"
                                weight="fill"
                              />
                              <span className="text-xs text-neutral-400">
                                <NumberFlow value={action.amount} />
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-neutral-600 ">
                            {action.bettingRound?.type || "Unknown"}
                          </span>
                        </div>

                        {action.reasoning && (
                          <div>
                            <div className="text-xs text-neutral-600 mb-1">
                              Reasoning:
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed">
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
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-neutral-500">
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

function RankingsTab({ players }: { players?: PlayerWithRelations[] }) {
  const [rankedPlayers, setRankedPlayers] = useState<PlayerWithWinnings[]>([]);

  useMemo(() => {
    if (players) {
      const sortedPlayers = players
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

  if (!players) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-40">
          <p className="text-xs text-neutral-500">No player data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <h3 className="text-xs font-medium uppercase text-neutral-200">
          Winnings
        </h3>
        <p className="text-xs text-neutral-500">How the models are doing</p>
      </div>

      <Reorder.Group
        as="div"
        axis="y"
        values={rankedPlayers}
        onReorder={setRankedPlayers}
        className="space-y-2"
      >
        {rankedPlayers.map((player) => (
          <Reorder.Item key={player.id} value={player}>
            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors">
              <div className="text-xs font-semibold">{player.name}</div>
              <div className="flex items-center gap-1">
                {player.totalWinnings > 0 && (
                  <>
                    <CaretUp size={14} className="text-lime-500" />
                    <div className="text-xs text-neutral-400">
                      <NumberFlow value={player.totalWinnings ?? 0} />
                    </div>
                  </>
                )}
                {player.totalWinnings < 0 && (
                  <>
                    <CaretDown size={14} className="text-red-500" />
                    <div className="text-xs text-neutral-400">
                      <NumberFlow value={player.totalWinnings ?? 0} />
                    </div>
                  </>
                )}
                {player.totalWinnings === 0 && (
                  <div className="text-xs text-neutral-500">
                    <NumberFlow value={0} />
                  </div>
                )}
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
