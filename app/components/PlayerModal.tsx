"use client";

import { useFloating, useClick, useDismiss, useRole, useInteractions, FloatingOverlay, FloatingFocusManager } from '@floating-ui/react';
import { useState } from 'react';
import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import NumberFlow from '@number-flow/react';
import { X, CaretUp, CaretDown } from "@phosphor-icons/react";
import Card from "./Card";

interface PlayerModalProps {
  player: InstaQLEntity<AppSchema, "players"> & {
    actions?: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>>;
    transactions?: Array<InstaQLEntity<AppSchema, "transactions">>;
    notes?: string;
  };
  cards?: string[];
  button?: boolean;
  data: {
    games?: Array<{
      gameRounds?: Array<InstaQLEntity<AppSchema, "gameRounds"> & {
        id: string;
        communityCards?: {
          cards?: string[];
        };
      }>;
    }>;
  };
  children: React.ReactNode;
}

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

export default function PlayerModal({ player, cards, button, data, children }: PlayerModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Get all actions for this player across all game rounds
  const playerActions = player.actions || [];
  const gameRounds = data?.games?.[0]?.gameRounds || [];

  // Group actions by game round
  const actionsByRound = gameRounds.map((round: InstaQLEntity<AppSchema, "gameRounds"> & { communityCards?: { cards?: string[] } }) => {
    const roundActions = playerActions.filter((action: InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>) => action.gameRound?.id === round.id);
    return {
      round,
      actions: roundActions
    };
  }).filter((group: { round: InstaQLEntity<AppSchema, "gameRounds"> & { communityCards?: { cards?: string[] } }, actions: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>> }) => group.actions.length > 0);

  // Calculate total winnings
  const totalWinnings = player.transactions?.reduce((acc, tx) => {
    return acc + (tx.credit ? tx.amount : -tx.amount);
  }, 0) || 0;

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()} className="cursor-pointer h-full">
        {children}
      </div>
      {isOpen && (
        <FloatingOverlay className="bg-black/80 z-50 flex items-center justify-center p-10" lockScroll>
          <FloatingFocusManager context={context}>
            <div
              ref={refs.setFloating}
              {...getFloatingProps()}
              className="text-neutral-200 font-geist-mono border border-neutral-900 relative max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
              <CornerBorders />
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-900 flex-shrink-0 bg-neutral-950">
                <div className="flex items-center gap-4">
                  <h1 className="text-sm font-semibold uppercase">{player.name}</h1>
                  {button && (
                    <div className="h-2 w-2 bg-white"></div>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 bg-neutral-950">
                {/* Current Status */}
                <div className="border-b border-neutral-900">
                  <div className="flex flex-col p-6 border-neutral-900">
                    <h1 className="text-sm font-semibold uppercase tracking-wider text-neutral-100">Current Status</h1>
                    <p className="text-xs text-neutral-500 mt-1">Player information</p>
                  </div>
                  
                  <div className="flex flex-row p-6 gap-8">
                    {/* Stack */}
                    <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Stack</div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 bg-neutral-900/50 px-3 py-2 border border-neutral-800/50 relative">
                          <div className="border-r-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -right-1"/>
                          <div className="border-l-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -left-1"/>
                          <div className="border-l-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -left-1"/>
                          <div className="border-r-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -right-1"/>
                          <div className="text-2xl text-lime-400">¤</div>
                          <div className="text-lg font-mono text-neutral-200 font-semibold">
                            <NumberFlow value={player.stack ?? 0} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Total Winnings */}
                    <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Total Winnings</div>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`flex items-center gap-2 px-3 py-2 border relative ${
                          totalWinnings >= 0 
                            ? 'bg-lime-500/10 border-lime-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                          <div className={`border-r-2 border-t-2 h-3 w-3 absolute -top-1 -right-1 ${
                            totalWinnings >= 0 ? 'border-lime-500/50' : 'border-red-500/50'
                          }`}/>
                          <div className={`border-l-2 border-b-2 h-3 w-3 absolute -bottom-1 -left-1 ${
                            totalWinnings >= 0 ? 'border-lime-500/50' : 'border-red-500/50'
                          }`}/>
                          <div className={`border-l-2 border-t-2 h-3 w-3 absolute -top-1 -left-1 ${
                            totalWinnings >= 0 ? 'border-lime-500/50' : 'border-red-500/50'
                          }`}/>
                          <div className={`border-r-2 border-b-2 h-3 w-3 absolute -bottom-1 -right-1 ${
                            totalWinnings >= 0 ? 'border-lime-500/50' : 'border-red-500/50'
                          }`}/>
                          {totalWinnings >= 0 ? (
                            <>
                              <CaretUp size={18} className="text-lime-400" />
                              <div className="text-lg font-mono text-lime-300 font-semibold">
                                <NumberFlow value={totalWinnings} />
                              </div>
                            </>
                          ) : (
                            <>
                              <CaretDown size={18} className="text-red-400" />
                              <div className="text-lg font-mono text-red-300 font-semibold">
                                <NumberFlow value={Math.abs(totalWinnings)} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Current Hand */}
                    {cards && cards.length > 0 && (
                      <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-300">Current Hand</div>
                        <div className="flex gap-2 p-3 bg-neutral-900/30 border border-neutral-800/50 relative">
                          <div className="border-r-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -right-1"/>
                          <div className="border-l-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -left-1"/>
                          <div className="border-l-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -left-1"/>
                          <div className="border-r-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -right-1"/>
                          {cards.map((card, index) => (
                            <div key={card} className="relative">
                              <Card 
                                value={card} 
                                className="w-10 h-14 shadow-lg transition-transform hover:scale-105" 
                              />
                              {index > 0 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/20 pointer-events-none" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Notes/Observations */}
                {player.notes && (
                  <div className="border-b border-neutral-900">
                    <div className="flex flex-col p-6 border-neutral-900">
                      <h1 className="text-sm font-semibold uppercase tracking-wider text-neutral-100">AI Observations</h1>
                      <p className="text-xs text-neutral-500 mt-1">Accumulated insights from previous rounds</p>
                    </div>
                    
                    <div className="p-6 bg-neutral-900/30">
                      <div className="relative p-4 bg-neutral-950 border border-neutral-800/50">
                        <div className="border-r-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -right-1"/>
                        <div className="border-l-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -left-1"/>
                        <div className="border-l-2 border-t-2 border-neutral-700 h-3 w-3 absolute -top-1 -left-1"/>
                        <div className="border-r-2 border-b-2 border-neutral-700 h-3 w-3 absolute -bottom-1 -right-1"/>
                        
                        <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                          {player.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Timeline */}
                <div>
                  <div className="flex flex-col p-4 border-b border-neutral-900">
                    <h1 className="text-xs font-medium uppercase">Action Timeline</h1>
                    <p className="text-xs text-neutral-500">Complete history of actions</p>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-neutral-900">
                    {actionsByRound.reverse().map((roundGroup: { round: InstaQLEntity<AppSchema, "gameRounds"> & { communityCards?: { cards?: string[] } }, actions: Array<InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>> }, roundIndex: number) => (
                      <div key={roundGroup.round.id} className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs font-medium uppercase text-neutral-400">Round {actionsByRound.length - roundIndex}</span>
                          {roundGroup.round.communityCards?.cards && roundGroup.round.communityCards.cards.length > 0 && (
                            <div className="flex gap-1 ml-2">
                              {roundGroup.round.communityCards.cards.map((card: string) => (
                                <Card key={card} value={card} className="w-6 h-8" />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          {roundGroup.actions.map((action: InstaQLEntity<AppSchema, "actions", {bettingRound: object, gameRound: object}>) => (
                            <div key={action.id} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-200 font-mono uppercase font-medium">
                                  {action.type}
                                </span>
                                {action.amount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="text-lg text-lime-500">¤</div>
                                    <div className="text-xs text-neutral-400">
                                      <NumberFlow value={action.amount} />
                                    </div>
                                  </div>
                                )}
                                                              <span className="text-xs text-neutral-500 font-mono font-medium">
                                {action.bettingRound?.type || 'Unknown round'}
                              </span>
                              </div>
                              
                              {action.reasoning && (
                                <div>
                                  <div className="text-xs text-neutral-500 mb-1 font-medium uppercase">Reasoning:</div>
                                  <p className="text-xs text-neutral-400 leading-relaxed">
                                    {action.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {actionsByRound.length === 0 && (
                      <div className="flex items-center justify-center p-8">
                        <p className="text-xs text-neutral-500 font-medium">No actions recorded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      )}
    </>
  );
} 