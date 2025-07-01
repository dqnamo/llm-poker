// AI player decision-making logic

import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ActionResult } from './types';
import { GAME_CONFIG } from './constants';

/**
 * Generate an AI player's action based on the current game state
 * @param params - Parameters including player info, cards, bet, context, pot, stack, model, and API key
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
  position,
  notes,
  apiKey
}: {
  playerId: string;
  cards: string[];
  bet: number;
  context: string[];
  pot: number;
  playerStack: number;
  model: string;
  position: string;
  notes?: string;
  apiKey?: string;
}): Promise<ActionResult[]> {
  
  // Define available tools based on the current bet
  // If bet is 0, player can check or bet
  // If bet > 0, player must call, raise, or fold
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
    call: tool({
      description: 'Call the current bet (match what others have bet)',
      parameters: z.object({
        reasoning: z.string().describe('The reasoning for the call'),
      }),
    }),
    raise: tool({
      description: 'Raise the bet (bet more than the current bet)',
      parameters: z.object({
        raiseAmount: z.number().describe('The amount to raise BY (not the total bet)'),
        reasoning: z.string().describe('The reasoning for the raise'),
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
    // Create OpenRouter client with provided API key or fallback to environment
    const openrouter = createOpenRouter({
      apiKey: apiKey || process.env.OPENROUTER_API_KEY || "",
    });

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
        position,
        notes
      }),
      tools: toolsAvailable as any,
      toolChoice: "required",
      maxTokens: 10000,
    });

    // Validate and return the action
    return validateAction(toolCalls, bet, playerStack);
  } catch (error) {
    console.error(`Error generating action for ${playerId}:`, error);
    // Default to checking if no bet required, otherwise fold
    if (bet === 0) {
      return [{
        toolName: "check",
        args: { reasoning: "Error occurred while making decision. Checking." }
      }];
    }
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
  position,
  notes
}: {
  playerId: string;
  cards: string[];
  bet: number;
  pot: number;
  playerStack: number;
  context: string[];
  minBet: number;
  position: string;
  notes?: string;
}): string {
  // Special handling for when no additional bet is required
  const actionOptions = bet === 0 
    ? `- You can CHECK (free - you've already matched the current bet) or BET (minimum ${minBet})`
    : `- You can CALL to match the current bet (costs ${Math.min(bet, playerStack)} chips)
- You can RAISE by betting MORE than the current bet (specify how much to raise BY, not total)
- You can FOLD to exit the hand`;

  return `
You are a poker player in a Texas Hold'em game.
Your player ID: ${playerId}
Your hole cards: ${cards.join(", ")}
Your position: ${position}

CURRENT GAME STATE:
- Amount you need to call: ${bet} chips ${bet === 0 ? '(you have already matched the current bet)' : ''}
- Current pot size: ${pot}
- Your chip stack: ${playerStack}
- Minimum bet: ${minBet}

AVAILABLE ACTIONS:
${actionOptions}
- You cannot bet more than ${playerStack} (your stack)
- If you don't have enough chips to call, you'll automatically go all-in

${notes ? `YOUR NOTES FROM PREVIOUS ROUNDS:
${notes}

` : ''}GAME CONTEXT:
${context.join("\n")}

${position === "Big Blind" && bet === 0 ? "Note: As the big blind, you've already posted your blind. Since no one has raised, you can check for free or bet if you have a strong hand." : ""}
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
  
  // Handle call action
  if (action.toolName === "call") {
    const callAmount = Math.min(currentBet, playerStack);
    return [{
      toolName: "bet",
      args: {
        amount: callAmount,
        reasoning: action.args.reasoning
      }
    }];
  }
  
  // Handle raise action
  if (action.toolName === "raise") {
    const raiseBy = action.args.raiseAmount;
    const totalBet = currentBet + raiseBy;
    
    // Can't bet more than stack
    if (totalBet > playerStack) {
      // Go all-in if trying to raise more than stack
      return [{
        toolName: "bet",
        args: {
          amount: playerStack,
          reasoning: `Going all-in with ${playerStack} (wanted to raise but insufficient stack)`
        }
      }];
    }
    
    // Ensure raise is at least the minimum bet
    if (raiseBy < GAME_CONFIG.MIN_BET) {
      return [{
        toolName: "fold",
        args: {
          reasoning: `Invalid raise amount ${raiseBy} (less than minimum ${GAME_CONFIG.MIN_BET}). Forced to fold.`
        }
      }];
    }
    
    return [{
      toolName: "bet",
      args: {
        amount: totalBet,
        reasoning: action.args.reasoning
      }
    }];
  }
  
  // Validate bet action (only used when current bet is 0)
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
    
    // Must bet at least the minimum when opening
    if (currentBet === 0 && betAmount < GAME_CONFIG.MIN_BET) {
      return [{
        toolName: "check",
        args: { 
          reasoning: `Bet of ${betAmount} is less than minimum ${GAME_CONFIG.MIN_BET}. Checking instead.` 
        }
      }];
    }
  }

  return [action];
}

/**
 * Synthesize observations from a completed round
 * @param params - Parameters including player info, round context, and existing notes
 * @returns Updated notes incorporating new observations
 */
export async function synthesizeRoundObservations({
  playerId,
  model,
  roundContext,
  existingNotes,
  myCards,
  communityCards,
  finalPot,
  winners,
  playerActions,
  apiKey
}: {
  playerId: string;
  model: string;
  roundContext: string[];
  existingNotes?: string;
  myCards: string[];
  communityCards: string[];
  finalPot: number;
  winners: { playerId: string; amount: number }[];
  playerActions: { playerId: string; action: string; reasoning: string }[];
  apiKey?: string;
}): Promise<string> {
  const prompt = `
You are a poker player who just finished a round of Texas Hold'em.
Your player ID: ${playerId}

ROUND SUMMARY:
- Your hole cards: ${myCards.join(", ")}
- Community cards: ${communityCards.join(", ")}
- Final pot: ${finalPot}
- Winners: ${winners.map(w => `Player ${w.playerId} won ${w.amount}`).join(", ")}

KEY ACTIONS FROM THIS ROUND:
${playerActions.map(a => `- Player ${a.playerId}: ${a.action} (Reasoning: "${a.reasoning}")`).join("\n")}

FULL ROUND CONTEXT:
${roundContext.join("\n")}

YOUR EXISTING NOTES:
${existingNotes || "No previous notes."}

Based on what happened in this round, synthesize your observations. Focus on:
1. Patterns in other players' betting behavior
2. Tells or tendencies you noticed (who bluffs, who plays tight, etc.)
3. Successful strategies you or others used
4. Mistakes to avoid in future rounds
5. Any other insights that would help you play better in future rounds

Keep your notes concise and actionable. Update your existing notes with new insights, don't just append - integrate and refine your understanding.

Respond with ONLY the updated notes text (no explanations or meta-commentary).`;

  try {
    // Create OpenRouter client with provided API key or fallback to environment
    const openrouter = createOpenRouter({
      apiKey: apiKey || process.env.OPENROUTER_API_KEY || "",
    });

    const { text } = await generateText({
      model: openrouter.chat('google/gemini-2.5-flash'),
      prompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    return text.trim();
  } catch (error) {
    console.error(`Error synthesizing observations for ${playerId}:`, error);
    // Return existing notes if synthesis fails
    return existingNotes || "";
  }
} 