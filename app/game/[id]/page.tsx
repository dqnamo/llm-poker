"use client";

import Card from "../../components/Card";
import { use, useEffect, useState } from "react";
import { init, InstaQLEntity } from "@instantdb/react";
import schema, { AppSchema } from "@/instant.schema";
import NumberFlow from '@number-flow/react'

import { CircleNotch, ArrowLeft, DiamondsFourIcon } from "@phosphor-icons/react";
import { calculateEquity, EquityResult } from 'poker-odds';
import FramedLink from "../../components/FramedLink";

import GameSidebar from "../../components/GameSidebar";
import Footer from "../../components/Footer";

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
  const [selectedPlayer, setSelectedPlayer] = useState<InstaQLEntity<AppSchema, "players"> & {
    transactions: InstaQLEntity<AppSchema, "transactions">[];
    actions?: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>>;
    notes?: string;
  } | null>(null);

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
    <div className="h-dvh bg-neutral-950 flex flex-col items-center justify-center p-8">
    <div className="max-w-7xl mx-auto w-full grid grid-cols-3">
      <div className="p-6 rounded-lg col-span-2">
      <div className="flex flex-col col-span-2">
          <div className="text-neutral-200 font-geist-mono grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-row items-center justify-between col-span-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold font-sans">Game <span className="text-neutral-500 font-semibold text-xs uppercase">{gameId.slice(-8)}</span></h1>
                  {game.gameRounds?.length < game.totalRounds && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-200">Live</span>
                    </div>
                  )}
                  {game.gameRounds?.length >= game.totalRounds && (
                    <div className="text-xs text-neutral-500">
                      Complete
                    </div>
                  )}
                </div>
                <p className="text-xs text-neutral-500 max-w-sm font-sans">
                  Round {game.gameRounds?.length || 0} of {game.totalRounds || 0}
                </p>
              </div>
              {/* <div className="flex flex-row items-center gap-2">
                <FramedLink href="/">
                  <ArrowLeft size={16} />
                  <p>Back to Live</p>
                </FramedLink>
                <FramedLink href="/history">
                  <ChartScatterIcon size={16} />
                  <p>All Games</p>
                </FramedLink>
              </div> */}
            </div>
            <div className="grid grid-cols-3 relative col-span-3 lg:col-span-3 space-x-2">
              {/* <CornerBorders /> */}
              <Player player={game.players[0]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[0]?.id)[0]?.cards.cards} active={game.currentActivePosition === 0} button={game.buttonPosition === 0} lastAction={game.players[0]?.actions?.[game.players[0]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
              <Player player={game.players[1]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[1]?.id)[0]?.cards.cards} active={game.currentActivePosition === 1} button={game.buttonPosition === 1} lastAction={game.players[1]?.actions?.[game.players[1]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
              <Player player={game.players[2]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[2]?.id)[0]?.cards.cards} active={game.currentActivePosition === 2} button={game.buttonPosition === 2} lastAction={game.players[2]?.actions?.[game.players[2]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
              <Table cards={game.gameRounds[game.gameRounds.length - 1]?.communityCards.cards} pot={game.gameRounds[game.gameRounds.length - 1]?.pot ?? 0} />
              <Player player={game.players[5]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[5]?.id)[0]?.cards.cards} active={game.currentActivePosition === 5} button={game.buttonPosition === 5} lastAction={game.players[5]?.actions?.[game.players[5]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
              <Player player={game.players[4]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[4]?.id)[0]?.cards.cards} active={game.currentActivePosition === 4} button={game.buttonPosition === 4} lastAction={game.players[4]?.actions?.[game.players[4]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
              <Player player={game.players[3]} cards={game.gameRounds[game.gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === game.players[3]?.id)[0]?.cards.cards} active={game.currentActivePosition === 3} button={game.buttonPosition === 3} lastAction={game.players[3]?.actions?.[game.players[3]?.actions?.length - 1]} data={data} equity={equity} onSelect={setSelectedPlayer} />
            </div>
          </div>
        </div>
      </div>
      <div className="relative h-0 min-h-full">
        <div className="absolute inset-0 overflow-y-auto p-6">
          <GameSidebar 
            game={game} 
            selectedPlayer={selectedPlayer}
            onPlayerSelect={setSelectedPlayer}
          />
        </div>
      </div>
    </div>
    <Footer />
  </div>
  )
}

const Player = ({player, cards, active, button, lastAction,data, equity, onSelect}: {player: InstaQLEntity<AppSchema, "players"> & {
  transactions: InstaQLEntity<AppSchema, "transactions">[];
  actions?: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>>;
  notes?: string;
}, cards?: string[], active?: boolean, button?: boolean, lastAction?: InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>, data: {
  games?: Array<{
    gameRounds?: Array<InstaQLEntity<AppSchema, "gameRounds"> & {
      id: string;
      bettingRounds?: Array<InstaQLEntity<AppSchema, "bettingRounds"> & { id: string }>;
      communityCards?: { cards?: string[] };
    }>;
  }>;
}, equity: EquityResult[], onSelect: (player: InstaQLEntity<AppSchema, "players"> & {
  transactions: InstaQLEntity<AppSchema, "transactions">[];
  actions?: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>>;
  notes?: string;
}) => void}) => {
  if (!player) {
    return <LoadingPlayer />;
  }

  const lastActionFolded = lastAction?.type === "fold" && lastAction?.gameRound?.id === data?.games?.[0]?.gameRounds?.[data.games[0].gameRounds.length - 1]?.id;

  const playerEquity = equity.find(e => cards && e.hand.length === cards.length && e.hand.every(c => cards.includes(c)));
  const winPercentage = playerEquity ? (playerEquity.wins / playerEquity.count) * 100 : null;

  return (
    <div 
      onClick={() => onSelect(player)}
      className={`p-px overflow-hidden relative rounded-md h-full ${active ? "border-animation" : ""} flex flex-col ${lastActionFolded ? "opacity-50" : ""} transition-colors cursor-pointer`}
    >
      <div className={`bg-neutral-950 relative hover:bg-neutral-900 flex flex-col h-full rounded-md`}>
          {/* Player info section - fixed height */}
          <div className="flex flex-col lg:flex-row items-start gap-2 justify-between p-4">
            <div className="flex flex-col h-full">
              <div className="text-xs font-semibold font-sans capitalize">{player?.name}</div>
              
              <div className="flex flex-row items-center gap-1 mt-1">
                <DiamondsFourIcon size={14} className="text-green-500" weight="fill" />
                <div className="text-xs font-sans text-neutral-400">
                  <NumberFlow
                    value={player?.stack ?? 0}
                  />
                </div>
              </div>
              {/* Always reserve space for button to prevent layout shift */}
              <div className={`absolute rounded-full top-4 right-4 h-3 w-3 ${button ? 'bg-white' : 'bg-transparent'}`}>
              </div>

              <div className="flex flex-col gap-1 mt-auto">
            {/* Always reserve space for thinking state to prevent layout shift */}
            {/* <div className={`text-[11px] font-medium flex flex-row items-center uppercase gap-1 mt-2 ${active ? 'text-neutral-200' : 'text-transparent'}`}>
              <SpinnerGapIcon size={14} className={`${active ? 'animate-spin text-neutral-200' : 'text-transparent'}`} weight="bold" />
              Thinking...
            </div> */}
            
            {lastAction?.reasoning && (lastAction as InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>)?.gameRound?.id === data?.games?.[0]?.gameRounds?.[data.games[0].gameRounds.length - 1]?.id ? (
              <>
                <div className="flex flex-row items-center gap-2  rounded-md">
                <div className="text-xs  text-neutral-200 font-sans font-medium capitalize">
                  {lastAction.reasoning?.includes('Posted the small blind') ? 'Small Blind' :
                   lastAction.reasoning?.includes('Posted the big blind') ? 'Big Blind' :
                   lastAction?.type}
                </div>
            
                {Number(lastAction?.amount) > 0 && (
                  <div className="flex flex-row items-center gap-1">
                    {/* <div className="text-lg bg-white rounded-full p-1 text-lime-500">¤</div> */}
                    <DiamondsFourIcon size={14} className="text-green-500" weight="fill" />
                    <div className="text-xs font-sans text-neutral-400">
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
                <div className="text-xs  text-neutral-500 font-sans font-medium">Hasn&apos;t acted yet</div>
              </div>
            )}
          </div>
              
            </div>

            <div className="flex flex-col items-end gap-4">
                <div className="flex flex-row items-end gap-1">
                  {/* Always reserve space for 2 cards */}
                  <div className="flex flex-row items-end gap-1">
                    {cards && cards.length >= 1 ? (
                      <Card value={cards[0]} className="w-8 h-11 sm:w-8 sm:h-11" />
                    ) : (
                      <div className="w-8 h-11 sm:w-8 sm:h-11 bg-transparent"></div>
                    )}
                    {cards && cards.length >= 2 ? (
                      <Card value={cards[1]} className="w-8 h-11 sm:w-8 sm:h-11" />
                    ) : (
                      <div className="w-8 h-11 sm:w-8 sm:h-11 bg-transparent"></div>
                    )}
                  </div>
                </div>

                {/* Always reserve space for win percentage to prevent layout shift */}
                <div className={`${winPercentage !== null && !lastActionFolded ? 'opacity-100' : 'opacity-0'} flex flex-col items-end`}>
                  <div className="text-sm font-sans font-medium text-neutral-300 flex flex-row items-end gap-1">
                    <NumberFlow
                      value={(winPercentage ?? 0)/100}
                      format={{
                        style: 'percent',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-sans text-neutral-500">
                    Win Probability
                  </p>
                </div>
              </div>
          </div>
        </div>
      </div>
  );
};

const Table = ({cards, pot}: {cards: string[], pot: number}) => {
  return (
    <div className="col-span-6 relative perspective-[1000px] mb-8 w-[95%] mx-auto">
      <div 
        className="bg-radial w-full from-emerald-700 to-emerald-950 p-20 rounded-full relative overflow-hidden transform-gpu"
        style={{
          transform: 'rotateX(28deg)',
          transformStyle: 'preserve-3d',
          boxShadow: 'inset 0 4px 20px rgba(255, 255, 255, 0.15), inset 0 -4px 20px rgba(0, 0, 0, 0.4)',
          border: '20px solid transparent',
          backgroundImage: `
            radial-gradient(ellipse at center, #10b981 0%, #065f46 100%),
            linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 25%, #0f0f0f 50%, #171717 75%, #1f1f1f 100%)
          `,
          backgroundOrigin: 'padding-box, border-box',
          backgroundClip: 'padding-box, border-box',
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
        
        {/* Diamond icon imprint on felt */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <DiamondsFourIcon size={120} className="text-white" weight="fill" />
        </div>
        {/* Shadow underneath the table */}
        <div 
          className="absolute inset-0 bg-black/30 blur-xl rounded-full"
          style={{
            transform: 'translateZ(-10px) translateY(20px) scaleX(1.1)',
            zIndex: -1
          }}
        />
        <div className="flex flex-col items-center justify-center relative z-10 min-h-[120px]">
          {/* Always reserve space for pot display */}
          <div className={`flex flex-row items-center gap-1 bg-green-950/50 rounded-md px-4 py-2 ${Number(pot) > 0 ? 'opacity-100' : 'opacity-0'}`}>
            {/* <div className="text-lg text-lime-500">¤</div> */}
            <DiamondsFourIcon size={14} className="text-green-500" weight="fill" />
            <div className="text-xs font-sans text-neutral-400">
              <NumberFlow
                value={pot ?? 0}
              />
            </div>
          </div>

          {/* Always reserve space for 5 community cards */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            {Array.from({ length: 5 }).map((_, index) => (
              cards && cards[index] ? (
                <Card key={cards[index]} value={cards[index]} className="w-8 h-11 sm:w-10 sm:h-14 transform-gpu" />
              ) : (
                <div key={`placeholder-${index}`} className="w-8 h-11 sm:w-10 sm:h-14 bg-transparent"></div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};





type PlayerWithRelations = InstaQLEntity<AppSchema, "players"> & {
  transactions: InstaQLEntity<AppSchema, "transactions">[];
}



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