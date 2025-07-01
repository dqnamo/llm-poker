import { NextRequest, NextResponse } from 'next/server';
import { startCustomGame } from '@/trigger/start-custom-game';
import { id } from '@instantdb/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { models, startingStack, numberOfHands, openRouterKey } = body;

    // Validate input
    if (!models || models.length !== 6) {
      return NextResponse.json(
        { error: 'Please select exactly 6 models' },
        { status: 400 }
      );
    }

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required' },
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
      models,
      startingStack,
      numberOfHands,
      openRouterKey,
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