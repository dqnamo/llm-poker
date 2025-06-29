// AI player decision-making logic

import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ActionResult } from './types';
import { GAME_CONFIG } from './constants';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

/**
 * Generate an AI player's action based on the current game state
 * @param params - Parameters including player info, cards, bet, context, pot, stack, and model
 * @returns The AI's chosen action with reasoning
 */
export async function generateAction({
  playerId,
  cards,
  bet,
  context,
  pot,
  playerStack,
  model,
  position
}: {
  playerId: string;
  cards: string[];
  bet: number;
  context: string[];
  pot: number;
  playerStack: number;
  model: string;
  position: string;
}): Promise<ActionResult[]> {
  
  // Define available tools based on the current bet
  const toolsAvailable = bet === 0 ? {
    bet: tool({
      description: 'Bet a certain amount of money',
      parameters: z.object({
        amount: z.number().describe('The amount to bet'),
        reasoning: z.string().describe('The reasoning for the bet'),
      }),
    }),
    check: tool({
      description: 'Check the hand',
      parameters: z.object({
        reasoning: z.string().describe('The reasoning for the check'),
      }),
    }),
  } : {
    bet: tool({
      description: 'Bet a certain amount of money (call, raise, or all-in)',
      parameters: z.object({
        amount: z.number().describe('The amount to bet'),
        reasoning: z.string().describe('The reasoning for the bet'),
      }),
    }),
    fold: tool({
      description: 'Fold the hand',
      parameters: z.object({
        reasoning: z.string().describe('The reasoning for the fold'),
      }),
    }),
  };

  try {
    const { toolCalls } = await generateText({
      model: openrouter.chat(model),
      prompt: buildPokerPrompt({
        playerId,
        cards,
        bet,
        pot,
        playerStack,
        context,
        minBet: GAME_CONFIG.MIN_BET,
        position
      }),
      tools: toolsAvailable as any,
      toolChoice: "required",
    });

    // Validate and return the action
    return validateAction(toolCalls, bet, playerStack);
  } catch (error) {
    console.error(`Error generating action for ${playerId}:`, error);
    // Default to folding on error
    return [{
      toolName: "fold",
      args: { reasoning: "Error occurred while making decision. Folding for safety." }
    }];
  }
}

/**
 * Build the prompt for the AI player
 */
function buildPokerPrompt({
  playerId,
  cards,
  bet,
  pot,
  playerStack,
  context,
  minBet,
  position
}: {
  playerId: string;
  cards: string[];
  bet: number;
  pot: number;
  playerStack: number;
  context: string[];
  minBet: number;
  position: string;
}): string {
  return `
You are a poker player in a Texas Hold'em game.
Your player ID: ${playerId}
Your hole cards: ${cards.join(", ")}
Your position: ${position}

CURRENT GAME STATE:
- Current bet to call: ${bet}
- Current pot size: ${pot}
- Your chip stack: ${playerStack}
- Minimum bet: ${minBet}

BETTING RULES:
- To stay in the hand when bet > 0, you must bet at least ${bet} (call)
- To raise, bet more than ${bet}
- You cannot bet more than ${playerStack} (your stack)
- If you don't have enough chips to call, you can go all-in with your remaining stack
- If bet = 0, you can check (free) or bet (minimum ${minBet})

GAME CONTEXT:
${context.join("\n")}
`;
}

/**
 * Validate the AI's action and ensure it follows game rules
 */
function validateAction(
  toolCalls: any[],
  currentBet: number,
  playerStack: number
): ActionResult[] {
  // No action means fold
  if (!toolCalls || toolCalls.length === 0) {
    return [{
      toolName: "fold",
      args: { reasoning: "No action taken. Folding by default." }
    }];
  }

  const action = toolCalls[0];
  
  // Validate bet action
  if (action.toolName === "bet") {
    const betAmount = action.args.amount;
    
    // Can't bet more than stack
    if (betAmount > playerStack) {
      return [{
        toolName: "fold",
        args: { 
          reasoning: `Cannot bet ${betAmount} with only ${playerStack} in stack. Forced to fold.` 
        }
      }];
    }
    
    // Must bet at least the current bet to stay in
    if (betAmount < currentBet && playerStack >= currentBet) {
      return [{
        toolName: "fold",
        args: { 
          reasoning: `Bet of ${betAmount} is less than required ${currentBet}. Forced to fold.` 
        }
      }];
    }
    
    // If can't afford full bet, it's an all-in
    if (betAmount < currentBet && playerStack < currentBet) {
      return [{
        toolName: "bet",
        args: {
          amount: playerStack,
          reasoning: `Going all-in with ${playerStack} (cannot afford full bet of ${currentBet})`
        }
      }];
    }
  }

  return [action];
} 