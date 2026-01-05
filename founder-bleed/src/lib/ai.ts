import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default model configuration
export const DEFAULT_MODEL = 'gpt-5.2';

// Model selection based on task complexity
export function getModel(tier: 'standard' | 'premium' = 'standard') {
  return tier === 'premium' ? openai('gpt-5.2') : openai('gpt-5-mini');
}

// Cost estimation (per 1M tokens)
export const MODEL_PRICING = {
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-5.2': { input: 2.5, output: 10 }, // GPT-5.2 pricing
  'gpt-5-mini': { input: 0.3, output: 1.2 }, // GPT-5-mini pricing
} as const;

// Calculate cost in cents from token usage
export function calculateCostCents(
  promptTokens: number,
  completionTokens: number,
  model: string = 'gpt-4o'
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-4o'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.ceil((inputCost + outputCost) * 100);
}
