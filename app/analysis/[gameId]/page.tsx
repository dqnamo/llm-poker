"use client";
import { init } from "@instantdb/react";
import schema from "@/instant.schema";
import { useParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { CircleNotch } from "@phosphor-icons/react";
import NumberFlow from '@number-flow/react';

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

// Color palette for different players
const PLAYER_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'
];

const CornerBorders = () => {
  return (
    <>  
    <div className="border-r-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -right-1"/>
    <div className="border-l-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -left-1"/>
    <div className="border-l-3 border-t-3 border-neutral-800 h-4 w-4 absolute -top-1 -left-1"/>
    <div className="border-r-3 border-b-3 border-neutral-800 h-4 w-4 absolute -bottom-1 -right-1"/>
    </>
  );
};

export default function AnalysisPage() {
  const { gameId } = useParams()

  const {data, isLoading, error} = db.useQuery({
    games: {
      $: {
        where: {
          id: gameId as string
        }
      },
      players: {
        actions: {
          gameRound: {},
          bettingRound: {}
        },
        transactions: {}
      },
      gameRounds: {
        bettingRounds: {},
        hands: {
          player: {
            transactions: {}
          },
        },
      }
    }
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
    game.players?.forEach(player => {
      let runningBalance = 0;
      
      // Sort transactions by createdAt
      const sortedTransactions = [...(player.transactions || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      sortedTransactions.forEach(transaction => {
        // Update running balance
        runningBalance += transaction.credit ? transaction.amount : -transaction.amount;
        
        allTransactions.push({
          playerId: player.id,
          playerName: player.name,
          amount: transaction.amount,
          credit: transaction.credit,
          createdAt: new Date(transaction.createdAt),
          runningBalance
        });
      });
    });

    // Sort all transactions by time
    allTransactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Create time series data points
    const timeSeriesMap = new Map<number, Record<string, unknown>>();
    const playerBalances = new Map<string, number>();

    // Initialize all players with 0 balance
    game.players?.forEach(player => {
      playerBalances.set(player.id, 0);
    });

    allTransactions.forEach(transaction => {
      const timestamp = transaction.createdAt.getTime();
      
      // Update the balance for this player
      playerBalances.set(transaction.playerId, transaction.runningBalance);
      
      // Create a data point with all player balances at this time
      const dataPoint: Record<string, unknown> = {
        time: timestamp,
        timestamp: transaction.createdAt.toLocaleString(),
      };
      
      // Add all player balances to this data point
      game.players?.forEach(player => {
        dataPoint[player.name] = playerBalances.get(player.id) || 0;
      });
      
      timeSeriesMap.set(timestamp, dataPoint);
    });

    // Convert to array and sort by time
    return Array.from(timeSeriesMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
          <CircleNotch size={16} className="animate-spin" />
          <p className="text-xs text-neutral-500 font-semibold uppercase">Loading Game Analysis</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Error Loading Game</p>
          <p className="text-xs text-neutral-400">{error.message}</p>
        </div>
      </div>
    );
  }

  const game = data?.games?.[0];
  if (!game) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Game Not Found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-10">
      <div className="text-neutral-200 font-geist-mono max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-row items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-semibold uppercase">Game Analysis</h1>
            <div className="text-xs text-neutral-500 max-w-sm">Transaction history and player performance over time.</div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="flex flex-col border border-neutral-900 relative mb-8">
          <CornerBorders />
          <div className="flex flex-col p-4 border-b border-neutral-900">
            <h2 className="text-xs font-medium uppercase">Player Balances Over Time</h2>
            <p className="text-xs text-neutral-500">How each player&#39;s position changed throughout the game</p>
          </div>
          
          <div className="bg-neutral-950 p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
                    fontSize={10}
                    tick={{ fill: '#737373' }}
                    tickFormatter={(value) => `¤${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #262626',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#a3a3a3', fontSize: '11px' }}
                    formatter={(value: number, name: string) => [
                      <span key={`${name}-${value}`} className="flex items-center gap-1 text-neutral-200">
                        <span className="text-lime-500">¤</span>
                        <NumberFlow value={value} />
                      </span>,
                      name
                    ]}
                    itemSorter={(item) => {
                      // Sort by value in descending order (highest winnings first)
                      return -(item.value ?? 0);
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
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
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-neutral-500 font-semibold uppercase">No Transaction Data Available</p>
              </div>
            )}
          </div>
        </div>

        {/* Game Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Game Details */}
          <div className="flex flex-col border border-neutral-900 relative">
            <CornerBorders />
            <div className="flex flex-col p-4 border-b border-neutral-900">
              <h3 className="text-xs font-medium uppercase">Game Details</h3>
              <p className="text-xs text-neutral-500">Basic game information</p>
            </div>
            <div className="bg-neutral-950 p-4 space-y-3">
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium uppercase">Total Rounds</span>
                <span className="text-xs text-neutral-200">
                  <NumberFlow value={game.gameRounds?.length || 0} />
                </span>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium uppercase">Players</span>
                <span className="text-xs text-neutral-200">
                  <NumberFlow value={game.players?.length || 0} />
                </span>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium uppercase">Created</span>
                <span className="text-xs text-neutral-200">
                  {new Date(game.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Current Rankings */}
          <div className="flex flex-col border border-neutral-900 relative">
            <CornerBorders />
            <div className="flex flex-col p-4 border-b border-neutral-900">
              <h3 className="text-xs font-medium uppercase">Current Standings</h3>
              <p className="text-xs text-neutral-500">Player rankings by total winnings</p>
            </div>
            <div className="bg-neutral-950 divide-y divide-neutral-900">
              {game.players
                ?.map(player => {
                  const totalWinnings = player.transactions?.reduce((acc, tx) => {
                    return acc + (tx.credit ? tx.amount : -tx.amount);
                  }, 0) || 0;
                  return { ...player, totalWinnings };
                })
                .sort((a, b) => b.totalWinnings - a.totalWinnings)
                .map((player, index) => (
                  <div key={player.id} className="flex flex-row items-center justify-between p-4">
                    <div className="flex flex-row items-center gap-2">
                      <span className="text-xs text-neutral-500 font-mono w-4">#{index + 1}</span>
                      <span className="text-xs font-semibold">{player.name}</span>
                    </div>
                    <div className="flex flex-row items-center gap-1">
                      <div className="text-sm text-lime-500">¤</div>
                      <div className={`text-xs ${player.totalWinnings >= 0 ? 'text-neutral-200' : 'text-red-400'}`}>
                        <NumberFlow value={player.totalWinnings} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="flex flex-col border border-neutral-900 relative">
            <CornerBorders />
            <div className="flex flex-col p-4 border-b border-neutral-900">
              <h3 className="text-xs font-medium uppercase">Transaction Summary</h3>
              <p className="text-xs text-neutral-500">Total money movement</p>
            </div>
            <div className="bg-neutral-950 p-4 space-y-3">
              {(() => {
                const allTransactions = game.players?.flatMap(p => p.transactions || []) || [];
                const totalCredits = allTransactions.filter(t => t.credit).reduce((sum, t) => sum + t.amount, 0);
                const totalDebits = allTransactions.filter(t => !t.credit).reduce((sum, t) => sum + t.amount, 0);
                
                return (
                  <>
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium uppercase">Total Credits</span>
                      <div className="flex flex-row items-center gap-1">
                        <div className="text-sm text-lime-500">¤</div>
                        <div className="text-xs text-neutral-200">
                          <NumberFlow value={totalCredits} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium uppercase">Total Debits</span>
                      <div className="flex flex-row items-center gap-1">
                        <div className="text-sm text-lime-500">¤</div>
                        <div className="text-xs text-red-400">
                          <NumberFlow value={totalDebits} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium uppercase">Transactions</span>
                      <span className="text-xs text-neutral-200">
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
    </div>
  );
}