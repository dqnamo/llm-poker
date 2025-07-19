"use client";

import Card from "../../components/Card";
import { use, useEffect, useState } from "react";
import { init, InstaQLEntity } from "@instantdb/react";
import schema, { AppSchema } from "@/instant.schema";
import NumberFlow from '@number-flow/react'
import { Reorder } from "motion/react"
import { CaretDown, CaretUp, ChartScatterIcon, CircleNotch, ArrowLeft } from "@phosphor-icons/react";
import { calculateEquity, EquityResult } from 'poker-odds';
import FramedLink from "../../components/FramedLink";
import PlayerModal from "../../components/PlayerModal";

// ID for app: LLM Poker
const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "";

const db = init({ appId: APP_ID, schema });

type hand = {
  player: { id: string }[];
  cards: string[];
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  
  const {data, isLoading, error} = db.useQuery({
    games: {
      $: {
        where: {
          id: gameId
        }
      },
      players: {
        actions: {
          gameRound: {},
          bettingRound: {}
        },
        transactions: {},
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

  const [equity, setEquity] = useState<EquityResult[]>([]);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);

  useEffect(() => {
    // check if current betting round is not preflop
    if (data?.games[0] && data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.bettingRounds[data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.bettingRounds.length - 1]?.type !== "preflop") {
      const game = data.games[0];
      const gameRound = game.gameRounds?.[game.gameRounds.length - 1];
      if (!gameRound) return;

      const board = gameRound.communityCards?.cards || [];
      const handsToShow = game.players.map(p => {
        const lastAction = p.actions?.[p.actions.length - 1];
        const lastActionFolded = lastAction?.type === "fold" && lastAction?.gameRound?.id === gameRound?.id;
        if (lastActionFolded) {
          return null;
        }
        const hand = gameRound.hands.find((h: InstaQLEntity<AppSchema, "hands", { player: object }>) => h.player[0]?.id === p.id);
        return hand?.cards?.cards;
      }).filter(Boolean);

      if (handsToShow.length > 1 && handsToShow.every(h => h.length > 0)) {
        const results = calculateEquity(handsToShow as string[][], board, 10000);
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
              id: gameId
            }
          },
          players: {
            actions: {
              gameRound: {},
              bettingRound: {}
            },
            transactions: {},
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
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoRefreshing, data, gameId]);

  if(isLoading) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
        <CircleNotch size={16} className="animate-spin" />
        <p className="text-xs text-neutral-500 font-semibold uppercase">Loading Game</p>
        </div>
      </div>
    )
  }

  if(error) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Error</p>
        </div>
      </div>
    )
  }

  if(!data?.games[0]) {
    return (
      <div className="flex flex-col h-dvh p-10 items-center justify-center">
        <div className="text-neutral-200 font-geist-mono w-max p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-500 font-semibold uppercase">Game Not Found</p>
          <FramedLink href="/">
            <ArrowLeft size={16} />
            <p>Back to Home</p>
          </FramedLink>
        </div>
      </div>
    )
  }

  const game = data.games[0];

  return (
    <div className="flex flex-col h-full p-10 bg-neutral-950">
      <div className="text-neutral-200 font-geist-mono grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">

        <div className="flex flex-row items-center justify-between col-span-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold uppercase">Game #{gameId.slice(-8)}</h1>
              {game.gameRounds?.length < game.totalRounds && (
                <div className="flex items-center gap-1 text-xs text-lime-500">
                  <CircleNotch size={12} className="animate-spin" />
                  <span>In Progress</span>
                </div>
              )}
              {game.gameRounds?.length >= game.totalRounds && (
                <div className="text-xs text-neutral-500">
                  Complete
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Round {game.gameRounds?.length || 0} of {game.totalRounds || 0}
            </p>
          </div>

          <div className="flex flex-row items-center gap-2">
            <FramedLink href="/">
              <ArrowLeft size={16} />
              <p>Back to Live</p>
            </FramedLink>
            <FramedLink href="/history">
              <ChartScatterIcon size={16} />
              <p>All Games</p>
            </FramedLink>
          </div>
        </div>

        <div className="grid grid-cols-3 relative col-span-3 lg:col-span-2">
          {/* <CornerBorders /> */}
          <Player player={game.players[0]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[0]?.id)[0]?.cards.cards} active={game.currentActivePosition === 0} button={game.buttonPosition === 0} lastAction={game.players[0]?.actions?.[game.players[0]?.actions?.length - 1]} data={data} equity={equity} />
          <Player player={game.players[1]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[1]?.id)[0]?.cards.cards} active={game.currentActivePosition === 1} button={game.buttonPosition === 1} lastAction={game.players[1]?.actions?.[game.players[1]?.actions?.length - 1]} data={data} equity={equity}/>
          <Player player={game.players[2]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[2]?.id)[0]?.cards.cards} active={game.currentActivePosition === 2} button={game.buttonPosition === 2} lastAction={game.players[2]?.actions?.[game.players[2]?.actions?.length - 1]} data={data} equity={equity}/>
          <Table cards={game.gameRounds[game.gameRounds.length - 1]?.communityCards.cards} pot={game.gameRounds[game.gameRounds.length - 1]?.pot ?? 0} />
          <Player player={game.players[5]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[5]?.id)[0]?.cards.cards} active={game.currentActivePosition === 5} button={game.buttonPosition === 5} lastAction={game.players[5]?.actions?.[game.players[5]?.actions?.length - 1]} data={data} equity={equity}/>
          <Player player={game.players[4]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[4]?.id)[0]?.cards.cards} active={game.currentActivePosition === 4} button={game.buttonPosition === 4} lastAction={game.players[4]?.actions?.[game.players[4]?.actions?.length - 1]} data={data} equity={equity}/>
          <Player player={game.players[3]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[3]?.id)[0]?.cards.cards} active={game.currentActivePosition === 3} button={game.buttonPosition === 3} lastAction={game.players[3]?.actions?.[game.players[3]?.actions?.length - 1]} data={data} equity={equity}/>
        </div>

        <div className="flex flex-col border rounded-md bg-neutral-900 border-neutral-800 relative col-span-3 lg:col-span-1 h-max">
          {/* <CornerBorders /> */}
          <div className="flex flex-col p-4 border-b border-neutral-900">
            <h1 className="text-xs font-medium uppercase">Winnings</h1>
            <p className="text-xs text-neutral-500">How the models are doing</p>
          </div>

          <Rankings players={game.players} />
        </div>
      </div>
    </div>
  );
}

const Player = ({player, cards, active, button, lastAction,data, equity}: {player: InstaQLEntity<AppSchema, "players">, cards?: string[], active?: boolean, button?: boolean, lastAction?: InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>, data: {
  games?: Array<{
    gameRounds?: Array<InstaQLEntity<AppSchema, "gameRounds"> & {
      id: string;
      bettingRounds?: Array<InstaQLEntity<AppSchema, "bettingRounds"> & { id: string }>;
      communityCards?: { cards?: string[] };
    }>;
  }>;
}, equity: EquityResult[]}) => {
  if (!player) {
    return <LoadingPlayer />;
  }

  const lastActionFolded = lastAction?.type === "fold" && lastAction?.gameRound?.id === data?.games?.[0]?.gameRounds?.[data.games[0].gameRounds.length - 1]?.id;

  const playerEquity = equity.find(e => cards && e.hand.length === cards.length && e.hand.every(c => cards.includes(c)));
  const winPercentage = playerEquity ? (playerEquity.wins / playerEquity.count) * 100 : null;

  return (
    <PlayerModal player={player} cards={cards} button={button} data={data}>
      <div className={`p-8 overflow-hidden relative ${active ? "border-animation" : ""} h-full flex flex-col ${lastActionFolded ? "opacity-50" : ""} transition-colors`}>
        <div className={`relative grid grid-cols-1 divide-neutral-900 flex-1 bg-neutral-950 hover:bg-neutral-900`}>
          <div className="flex flex-col lg:flex-row items-start gap-4 justify-between p-4 h-full">
            <div className="flex flex-col">
              <div className="text-xs font-semibold">{player?.name}</div>
              <div className="flex flex-row items-center gap-1">
                <div className="text-lg text-lime-500">¤</div>
                <div className="text-xs text-neutral-400">
                  <NumberFlow
                    value={player?.stack ?? 0}
                  />
                </div>
              </div>
              {button && (
                <div className="h-2 w-2 bg-white">

                </div>
              )}
            </div>
            <div className="flex flex-row items-center gap-1">
              {/* get the last hand for the player */}
              {cards && (
                cards.map((card) => (
                  <Card key={card} value={card} className="w-8 h-11 sm:w-8 sm:h-11" />
                ))
              )}
            </div>


          </div>

            <div className="flex flex-col mt-auto">
              {winPercentage !== null && !lastActionFolded && (
                <div>
                  <p className="text-xs text-neutral-500 px-4">
                    {winPercentage?.toFixed(1)}%
                  </p>
                <div className="h-px bg-neutral-900">
                  <div className="h-px bg-green-500" style={{width: `${winPercentage}%`}}>
                  </div>
                </div>
                </div>
              )}
              <div className="flex flex-col p-4 shrink-0 gap-1">
              
              {lastAction?.reasoning && (lastAction as InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>)?.gameRound?.id === data?.games?.[0]?.gameRounds?.[data.games[0].gameRounds.length - 1]?.id ? (
                <>
                  <div className="flex flex-row items-center gap-2">
                  <div className="text-xs  text-neutral-200 font-mono uppercase font-medium">
                    {lastAction.reasoning?.includes('Posted the small blind') ? 'SMALL BLIND' :
                     lastAction.reasoning?.includes('Posted the big blind') ? 'BIG BLIND' :
                     lastAction?.type}
                  </div>
              
                  {Number(lastAction?.amount) > 0 && (
                    <div className="flex flex-row items-center gap-1">
                      <div className="text-lg text-lime-500">¤</div>
                      <div className="text-xs text-neutral-400">
                        <NumberFlow
                          value={lastAction?.amount ?? 0}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-xs  text-neutral-500 font-mono font-medium">Hasn&apos;t acted yet</div>
            
                </div>
              )}
              </div>
            </div>
        </div>
      </div>
    </PlayerModal>
  );
};

const Table = ({cards, pot}: {cards: string[], pot: number}) => {
  return (
    <div className="col-span-6 relative perspective-[1000px] -mt-8">
      <div 
        className="bg-radial from-emerald-700 to-emerald-950 p-20 border-neutral-900 border-20 rounded-full relative overflow-hidden transform-gpu"
        style={{
          transform: 'rotateX(28deg)',
          transformStyle: 'preserve-3d',
          boxShadow: 'inset 0 4px 20px rgba(255, 255, 255, 0.15), inset 0 -4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Subtle diamond/cube pattern overlay */}
        <div 
          className="absolute inset-0 opacity-12"
          style={{
            backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.08) 75%),
                             linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.08) 75%)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px'
          }}
        />
        {/* Shadow underneath the table */}
        <div 
          className="absolute inset-0 bg-black/30 blur-xl rounded-full"
          style={{
            transform: 'translateZ(-10px) translateY(20px) scaleX(1.1)',
            zIndex: -1
          }}
        />
        <div className="flex flex-col items-center justify-center relative z-10">
          {Number(pot) > 0 && (
              <div className="flex flex-row items-center gap-1 bg-green-950/50 rounded-md px-4 py-2">
                <div className="text-lg text-lime-500">¤</div>
                <div className="text-xs text-neutral-400">
                  <NumberFlow
                    value={pot ?? 0}
                  />
                </div>
              </div>
            )}

          <div className="grid grid-cols-5 gap-4 mt-4">
            {cards && cards.map((card) => (
              <Card key={card} value={card} className="w-8 h-11 sm:w-10 sm:h-14 transform-gpu" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const RankingItem = ({player}: {player: PlayerWithWinnings}) => {
  return (
    <div className="flex flex-col p-2 px-4">
      <div className="flex flex-row items-center gap-1 justify-between">
        <div className="text-xs font-semibold">{player.name}</div>
        <div className="flex flex-row items-center gap-1">
          { player.totalWinnings > 0 && (
            <>
              <CaretUp size={16} className="text-lime-500" />
              <div className="text-xs text-neutral-400">
                <NumberFlow
                  value={player.totalWinnings ?? 0}
                />
              </div>
            </>
          )}
          { player.totalWinnings < 0 && (
            <>
              <CaretDown size={16} className="text-red-500" />
              <div className="text-xs text-neutral-400">
                <NumberFlow
                  value={player.totalWinnings ?? 0}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

type PlayerWithRelations = InstaQLEntity<AppSchema, "players"> & {
  transactions: InstaQLEntity<AppSchema, "transactions">[];
}

type PlayerWithWinnings = PlayerWithRelations & { totalWinnings: number };

const Rankings = ({players}: {players?: PlayerWithRelations[]}) => {
  const [rankedPlayers, setRankedPlayers] = useState<PlayerWithWinnings[]>([]);

  useEffect(() => {
    if (players) {
      const sortedPlayers = players.map(player => {
        const totalWinnings = player.transactions.reduce((acc, tx) => {
          return acc + (tx.credit ? tx.amount : -tx.amount);
        }, 0);
        return { ...player, totalWinnings };
      }).sort((a, b) => b.totalWinnings - a.totalWinnings);
      setRankedPlayers(sortedPlayers);
    }
  }, [players]);


  if (!players) {
    return (
      <div className="flex flex-col divide-y divide-neutral-900 border-b border-neutral-900">
      </div>
    );
  }

  return (
    <Reorder.Group as="ol" axis="y" values={rankedPlayers} onReorder={setRankedPlayers} className="flex flex-col divide-y divide-neutral-900 border-b border-neutral-900">
      {rankedPlayers.map(player => (
        <Reorder.Item key={player.id} value={player}>
          <RankingItem player={player} />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};

const LoadingPlayer = () => {
  return (
    <div className="bg-neutral-900 p-px overflow-hidden relative h-full flex flex-col">
      <div className="relative bg-neutral-950 flex flex-col divide-y divide-neutral-900 flex-1">
        <div className="flex flex-row items-start gap-4 justify-between p-4 h-full">
          <div className="flex flex-col gap-2">
            <div className="h-3 bg-neutral-800 rounded animate-pulse w-16"></div>
            <div className="h-4 bg-neutral-800 rounded animate-pulse w-12"></div>
          </div>
          <div className="flex flex-row items-center gap-1">
            <div className="w-8 h-11 bg-neutral-800 rounded animate-pulse"></div>
            <div className="w-8 h-11 bg-neutral-800 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex flex-col p-4 shrink-0 gap-2">
          <div className="h-3 bg-neutral-800 rounded animate-pulse w-20"></div>
          <div className="h-3 bg-neutral-800 rounded animate-pulse w-16"></div>
        </div>
      </div>
    </div>
  );
}; 