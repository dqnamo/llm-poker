"use client";
import { init } from "@instantdb/react";
import schema from "@/instant.schema";
import { useParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import {
  CircleNotch,
  ChartScatterIcon,
  GithubLogoIcon,
  DiamondsFourIcon,
  CaretUp,
  CaretDown,
  ArrowLeft,
} from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import AnimatedFramedLink from "../../components/AnimatedFramedLink";
import { CornerBorders } from "../../components/GameSidebar";
import Footer from "../../components/Footer";

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

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

export default function AnalysisPage() {
  const { gameId } = useParams();

  const { data, isLoading, error } = db.useQuery({
    games: {
      $: {
        where: {
          id: gameId as string,
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

  // Process transaction data for the chart
  const chartData = useMemo(() => {
    if (!data?.games?.[0]) return [];

    const game = data.games[0];
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
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-text-dim font-semibold uppercase">
            Loading Game Analysis
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
            Error Loading Game
          </p>
          <p className="text-xs text-text-dim">{error.message}</p>
        </div>
      </div>
    );
  }

  const game = data?.games?.[0];
  if (!game) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center bg-dark-1">
        <div className="text-text-medium w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-text-dim font-semibold uppercase">
            Game Not Found
          </p>
          <AnimatedFramedLink href="/history">
            <ArrowLeft size={16} />
            <p>Back to History</p>
          </AnimatedFramedLink>
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
                Game Analysis
              </h1>
              <span className="text-text-dim font-semibold text-xs 2xl:text-sm">
                #{(gameId as string).slice(-8)}
              </span>
            </div>
            <p className="text-xs 2xl:text-sm text-text-dim">
              Transaction history and player performance over time
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

        {/* Main Chart */}
        <div className="border border-dark-5 relative mb-6 2xl:mb-8">
          <CornerBorders colorClass="border-dark-8" />
          <div className="bg-dark-3 border-b border-dark-5 p-3 2xl:p-4">
            <h2 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
              Player Balances Over Time
            </h2>
            <p className="text-xs 2xl:text-sm text-text-dim">
              How each player&apos;s position changed throughout the game
            </p>
          </div>

          <div className="bg-dark-2 p-4 2xl:p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={400}
                className="2xl:!h-[500px]"
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-5)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--dark-8)"
                    tick={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--dark-8)"
                    fontSize={10}
                    tick={{ fill: "var(--text-dim)" }}
                    tickFormatter={(value) => `¤${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--dark-2)",
                      border: "1px solid var(--dark-5)",
                      borderRadius: "0px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--text-dim)", fontSize: "11px" }}
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
                    itemSorter={(item) => {
                      // Sort by value in descending order (highest winnings first)
                      return -(item.value ?? 0);
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "12px",
                      color: "var(--text-dim)",
                    }}
                    iconType="line"
                  />

                  {game.players?.map((player, index) => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={player.name}
                      stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 2xl:h-52">
                <p className="text-xs 2xl:text-sm text-text-dim font-semibold uppercase">
                  No Transaction Data Available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Game Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 2xl:gap-6">
          {/* Game Details */}
          <div className="border border-dark-5 relative">
            <CornerBorders colorClass="border-dark-8" />
            <div className="bg-dark-3 border-b border-dark-5 p-3 2xl:p-4">
              <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                Game Details
              </h3>
              <p className="text-xs 2xl:text-sm text-text-dim">
                Basic game information
              </p>
            </div>
            <div className="bg-dark-2 p-4 2xl:p-5 space-y-3 2xl:space-y-4">
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                  Total Rounds
                </span>
                <span className="text-xs 2xl:text-sm text-text-medium">
                  <NumberFlow value={game.gameRounds?.length || 0} />
                </span>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                  Players
                </span>
                <span className="text-xs 2xl:text-sm text-text-medium">
                  <NumberFlow value={game.players?.length || 0} />
                </span>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                  Created
                </span>
                <span className="text-xs 2xl:text-sm text-text-medium">
                  {new Date(game.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Current Rankings */}
          <div className="border border-dark-5 relative">
            <CornerBorders colorClass="border-dark-8" />
            <div className="bg-dark-3 border-b border-dark-5 p-3 2xl:p-4">
              <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                Current Standings
              </h3>
              <p className="text-xs 2xl:text-sm text-text-dim">
                Player rankings by total winnings
              </p>
            </div>
            <div className="bg-dark-2 divide-y divide-dark-5">
              {game.players
                ?.map((player) => {
                  const totalWinnings =
                    player.transactions?.reduce((acc, tx) => {
                      return acc + (tx.credit ? tx.amount : -tx.amount);
                    }, 0) || 0;
                  return { ...player, totalWinnings };
                })
                .sort((a, b) => b.totalWinnings - a.totalWinnings)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className="flex flex-row items-center justify-between p-3 2xl:p-4"
                  >
                    <div className="flex flex-row items-center gap-2 2xl:gap-3">
                      <span className="text-xs 2xl:text-sm text-text-dim w-4">
                        #{index + 1}
                      </span>
                      <span className="text-xs 2xl:text-sm font-semibold text-text-medium">
                        {player.name}
                      </span>
                    </div>
                    <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                      {player.totalWinnings >= 0 ? (
                        <CaretUp
                          size={12}
                          className="text-green-500 2xl:w-4 2xl:h-4"
                        />
                      ) : (
                        <CaretDown
                          size={12}
                          className="text-red-500 2xl:w-4 2xl:h-4"
                        />
                      )}
                      <DiamondsFourIcon
                        size={10}
                        className={`2xl:w-3 2xl:h-3 ${
                          player.totalWinnings >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                        weight="fill"
                      />
                      <div
                        className={`text-xs 2xl:text-sm ${
                          player.totalWinnings >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        <NumberFlow value={player.totalWinnings} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="border border-dark-5 relative">
            <CornerBorders colorClass="border-dark-8" />
            <div className="bg-dark-3 border-b border-dark-5 p-3 2xl:p-4">
              <h3 className="text-xs 2xl:text-sm font-medium uppercase text-text-bright">
                Transaction Summary
              </h3>
              <p className="text-xs 2xl:text-sm text-text-dim">
                Total money movement
              </p>
            </div>
            <div className="bg-dark-2 p-4 2xl:p-5 space-y-3 2xl:space-y-4">
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
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                        Total Credits
                      </span>
                      <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                        <DiamondsFourIcon
                          size={10}
                          className="text-green-500 2xl:w-3 2xl:h-3"
                          weight="fill"
                        />
                        <div className="text-xs 2xl:text-sm text-green-400">
                          <NumberFlow value={totalCredits} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                        Total Debits
                      </span>
                      <div className="flex flex-row items-center gap-1 2xl:gap-1.5">
                        <DiamondsFourIcon
                          size={10}
                          className="text-red-500 2xl:w-3 2xl:h-3"
                          weight="fill"
                        />
                        <div className="text-xs 2xl:text-sm text-red-400">
                          <NumberFlow value={totalDebits} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs 2xl:text-sm text-text-dim font-medium uppercase">
                        Transactions
                      </span>
                      <span className="text-xs 2xl:text-sm text-text-medium">
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
      <Footer />
    </div>
  );
}
