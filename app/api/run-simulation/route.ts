import { NextRequest, NextResponse } from 'next/server';
import { startCustomGame } from '@/trigger/start-custom-game';
import { id } from '@instantdb/admin';
import type { AIProvider } from '@/engine/ai-player';

export interface PlayerConfig {
  model: string;
  seatNumber?: number;
  emptySeat?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { players, startingStack, numberOfHands, apiKey, provider = 'openrouter' } = body as {
      players: PlayerConfig[];
      startingStack: number;
      numberOfHands: number;
      apiKey: string;
      provider?: AIProvider;
    };

    // Validate input
    if (!players || !Array.isArray(players) || players.length !== 6) {
      return NextResponse.json(
        { error: 'Please provide exactly 6 player configurations' },
        { status: 400 }
      );
    }

    // Validate each player configuration
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      // Empty seats don't need a model
      if (player.emptySeat) {
        continue;
      }

      // Non-empty seats must have a model
      if (!player.model || typeof player.model !== 'string') {
        return NextResponse.json(
          { error: `Player at position ${i} must have a valid model or be marked as an empty seat` },
          { status: 400 }
        );
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (startingStack < 100 || startingStack > 100000) {
      return NextResponse.json(
        { error: 'Starting stack must be between 100 and 100,000' },
        { status: 400 }
      );
    }

    if (numberOfHands < 1 || numberOfHands > 100) {
      return NextResponse.json(
        { error: 'Number of hands must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Generate a game ID upfront
    const gameId = id();

    // Trigger the custom game with the pre-generated ID
    const handle = await startCustomGame.trigger({
      gameId,
      players,
      startingStack,
      numberOfHands,
      apiKey,
      provider,
    });

    // Return the game ID directly
    return NextResponse.json({
      simulationId: gameId,
      message: 'Simulation started successfully',
      triggerHandle: handle.id
    });

  } catch (error) {
    console.error('Error starting simulation:', error);
    return NextResponse.json(
      { error: 'Failed to start simulation' },
      { status: 500 }
    );
  }
} 