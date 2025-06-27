"use client";

import Card from "./components/Card";
import { useEffect, useState } from "react";
import { id, i, init, InstaQLEntity } from "@instantdb/react";
import schema, { AppSchema } from "@/instant.schema";
import NumberFlow from '@number-flow/react'
import { motion } from "motion/react"

// ID for app: LLM Poker
const APP_ID = "9b591b1a-b90d-4eff-ba00-834a5d4fd311";

const db = init({ appId: APP_ID, schema });

type hand = {
  player: { id: string }[];
  cards: string[];
}

export default function Home() {
  const {data, isLoading, error} = db.useQuery({
    games: {
      $: {
        limit: 1,
        order: {
          createdAt: "desc"
        }
      },
      players: {
        actions: {
          gameRound: {},
          bettingRound: {}
        }
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

  return (
    <div className="flex flex-col h-dvh p-10">
      <div className="text-white font-geist-mono grid grid-cols-3 gap-8 max-w-7xl mx-auto w-full">

        <div className="flex flex-row items-center justify-between col-span-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-sm font-semibold uppercase">LLM Poker</h1>
            <p className="text-xs text-neutral-500 max-w-sm">A simple 6 handed poker game to test the reasoning capabilities of LLMs.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 border-neutral-900 border relative col-span-2">
            <CornerBorders />
            <LoadingPlayer />
            <LoadingPlayer />
            <LoadingPlayer />
            <LoadingTable />
            <LoadingPlayer />
            <LoadingPlayer />
            <LoadingPlayer />
          </div>
        ) : data?.games[0] ? (
          <div className="grid grid-cols-3 border-neutral-900 border relative col-span-2">
            <CornerBorders />
            <Player player={data?.games[0].players[0]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[0]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 0} lastAction={data?.games[0].players[0]?.actions?.[data?.games[0].players[0]?.actions?.length - 1]} data={data} />
            <Player player={data?.games[0].players[1]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[1]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 1} lastAction={data?.games[0].players[1]?.actions?.[data?.games[0].players[1]?.actions?.length - 1]} data={data}/>
            <Player player={data?.games[0].players[2]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[2]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 2} lastAction={data?.games[0].players[2]?.actions?.[data?.games[0].players[2]?.actions?.length - 1]} data={data}/>
            <Table cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.communityCards.cards} pot={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.pot ?? 0} />
            <Player player={data?.games[0].players[5]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[5]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 5} lastAction={data?.games[0].players[5]?.actions?.[data?.games[0].players[5]?.actions?.length - 1]} data={data}/>
            <Player player={data?.games[0].players[4]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[4]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 4} lastAction={data?.games[0].players[4]?.actions?.[data?.games[0].players[4]?.actions?.length - 1]} data={data}/>
            <Player player={data?.games[0].players[3]} cards={data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.hands.filter((hand: hand) => hand.player[0]?.id === data?.games[0].players[3]?.id)[0]?.cards.cards} active={data?.games[0].currentActivePosition === 3} lastAction={data?.games[0].players[3]?.actions?.[data?.games[0].players[3]?.actions?.length - 1]} data={data}/>
          </div>
        ) : (
          <div className="grid grid-cols-3 border-neutral-900 border relative col-span-2">
            <CornerBorders />
            <div className="flex items-center justify-center p-8 text-neutral-500">
              <p className="text-sm">No game data available</p>
            </div>
          </div>
        )}

        <div className="flex flex-col border border-neutral-900 relative">
          <CornerBorders />
          <div className="flex flex-col p-4 border-b border-neutral-900">
            <h1 className="text-xs font-medium uppercase">Winnings</h1>
            <p className="text-xs text-neutral-500">How the models are doing</p>
          </div>

          <Rankings />
        </div>

        {/* <div className="flex flex-col border border-neutral-900 relative col-span-3 h-40">
          <CornerBorders />
        </div> */}
      </div>
    </div>
  );
}

const Player = ({player, cards, active, lastAction,data}: {player: InstaQLEntity<AppSchema, "players">, cards?: string[], active?: boolean, lastAction?: InstaQLEntity<AppSchema, "actions">, data: any}) => {
  const [showThoughts, setShowThoughts] = useState(false);

  const lastActionFolded = lastAction?.type === "fold";

  return (
    <div className={`bg-neutral-900 p-px overflow-hidden relative ${active ? "border-animation" : ""} h-full flex flex-col ${lastActionFolded ? "opacity-50" : ""}`}>
      <div className={`relative bg-neutral-950 flex flex-col divide-y divide-neutral-900 flex-1`}>
        <div className="flex flex-row items-start gap-4 justify-between p-4 h-full">
          <div className="flex flex-col">
            <div className="text-xs font-semibold">{player?.name}</div>
            <div className="flex flex-row items-center gap-1">
              <div className="text-lg text-teal-500">¤</div>
              <div className="text-xs text-neutral-400">
                <NumberFlow
                  value={player.stack ?? 0}
                />
              </div>
            </div>
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
        <div className="flex flex-col p-4 shrink-0 gap-1">
        {lastAction?.reasoning && (lastAction as any)?.gameRound?.id === data?.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.id ? (
          <>
          {(lastAction.type !== 'bet' || (lastAction as any)?.bettingRound?.id === data?.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.bettingRounds[data.games[0].gameRounds[data.games[0].gameRounds.length - 1]?.bettingRounds.length - 1]?.id) && (
            <>
            <div className="text-xs  text-neutral-200 font-mono uppercase font-medium">{lastAction?.type}</div>
          

            {Number(lastAction?.amount) > 0 && (
              <div className="flex flex-row items-center gap-1">
                <div className="text-lg text-teal-500">¤</div>
                <div className="text-xs text-neutral-400">
                  <NumberFlow
                    value={lastAction?.amount ?? 0}
                  />
                </div>
              </div>
            )}
            </>
          )}
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setShowThoughts(!showThoughts)}
              className="text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer text-left"
            >
              {showThoughts ? 'Hide Thoughts' : 'Show Thoughts'}
            </button>
            {showThoughts && (
              <div className="text-xs text-neutral-400 bg-neutral-900 p-2 rounded border border-neutral-800">
                {lastAction.reasoning}
              </div>
            )}
          </div>
          </>
        ) : (
          <p className="text-xs text-neutral-500">Hasn't acted yet</p>
        )}
        </div>
      </div>
    </div>
  );
};

const Table = ({cards, pot}: {cards: string[], pot: number}) => {
  return (
    <div className="border p-20 border-neutral-900 col-span-6">
      <div className="flex flex-col items-center justify-center">
        {Number(pot) > 0 && (
            <div className="flex flex-row items-center gap-1">
              <div className="text-lg text-teal-500">¤</div>
              <div className="text-xs text-neutral-400">
                <NumberFlow
                  value={pot ?? 0}
                />
              </div>
            </div>
          )}


        <div className="grid grid-cols-5 gap-4 mt-4">
          {cards && cards.map((card) => (
            <Card key={card} value={card} className="w-8 h-11 sm:w-10 sm:h-14" />
          ))}
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

const RankingItem = () => {
  return (
    <div className="flex flex-col p-2 px-4">
      <div className="flex flex-row items-center gap-1 justify-between">
        <div className="text-xs font-semibold">GPT-3.5</div>
        <div className="flex flex-row items-center gap-1">
          <div className="text-lg text-teal-500">¤</div>
          <div className="text-xs text-neutral-400">1000</div>
        </div>
      </div>
    </div>
  );
};

const Rankings = () => {
  return (
    <div className="flex flex-col divide-y divide-neutral-900 border-b border-neutral-900">
      <RankingItem />
      <RankingItem />
      <RankingItem />
      <RankingItem />
    </div>
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

const LoadingTable = () => {
  return (
    <div className="border p-20 border-neutral-900 col-span-6">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="h-4 bg-neutral-800 rounded animate-pulse w-16"></div>
        <div className="grid grid-cols-5 gap-4">
          <div className="w-10 h-14 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-10 h-14 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-10 h-14 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-10 h-14 bg-neutral-800 rounded animate-pulse"></div>
          <div className="w-10 h-14 bg-neutral-800 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};