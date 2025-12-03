// Quick test of AI SDK functionality
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error('Please set OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const openrouter = createOpenRouter({
  apiKey: API_KEY,
});

const testTools = {
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
};

async function testAI() {
  console.log('Testing AI SDK with OpenRouter...');
  console.log('API Key (first 10 chars):', API_KEY.substring(0, 10) + '...');
  
  try {
    console.log('\n--- Making generateText call ---');
    
    const result = await generateText({
      model: openrouter.chat('anthropic/claude-3.5-haiku'),
      prompt: `You are in a poker game. You have Ace of Spades and King of Hearts. The pot is 100 chips. You have 1000 chips. Decide whether to check or bet.`,
      tools: testTools,
      toolChoice: 'required',
      maxTokens: 1000,
    });
    
    console.log('\n--- Result ---');
    console.log('Result keys:', Object.keys(result));
    console.log('toolCalls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('text:', result.text);
    console.log('finishReason:', result.finishReason);
    console.log('usage:', result.usage);
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('\n✅ SUCCESS: Tool calls received!');
      console.log('Tool name:', result.toolCalls[0].toolName);
      console.log('Tool args:', result.toolCalls[0].args);
    } else {
      console.log('\n❌ FAILURE: No tool calls in response');
      console.log('Full result:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }
}

testAI();

