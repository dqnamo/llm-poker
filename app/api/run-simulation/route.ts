import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@upstash/workflow";
import { id, init } from '@instantdb/admin';
import { DateTime } from "luxon";
import type { AIProvider } from '@/engine/ai-player';

// Force dynamic rendering - skip static analysis at build time
export const dynamic = 'force-dynamic';

export interface PlayerConfig {
  model: string;
  seatNumber?: number;
  emptySeat?: boolean;
}

// Initialize database for creating pending game records
const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID || "",
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN || "",
});

// Get base URL for workflow endpoints
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

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

    // Create a pending game record immediately so the game page can show "starting" state
    // This record will be updated by the workflow when it actually starts
    await db.transact(
      db.tx.games[gameId].update({
        totalRounds: numberOfHands,
        createdAt: DateTime.now().toISO(),
        buttonPosition: 0,
        currentActivePosition: null,
        deck: { cards: [] },
        customGame: true,
        // Note: players will be added by the workflow
      })
    );

    // Trigger the Upstash Workflow
    const client = new Client({ token: process.env.QSTASH_TOKEN! });
    const baseUrl = getBaseUrl();
    
    const { workflowRunId } = await client.trigger({
      url: `${baseUrl}/api/workflow/start-custom-game`,
      body: {
        gameId,
        players,
        startingStack,
        numberOfHands,
        apiKey,
        provider,
      },
      retries: 1,
    });

    // Update the game with the workflow run ID
    await db.transact(
      db.tx.games[gameId].update({
        jobHandleId: workflowRunId,
      })
    );

    // Return the game ID directly
    return NextResponse.json({
      simulationId: gameId,
      message: 'Simulation started successfully',
      workflowRunId
    });

  } catch (error) {
    console.error('Error starting simulation:', error);
    return NextResponse.json(
      { error: 'Failed to start simulation' },
      { status: 500 }
    );
  }
}
