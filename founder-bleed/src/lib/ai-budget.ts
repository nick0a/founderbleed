import { db } from '@/lib/db';
import { subscriptions, byokKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

export interface BudgetCheckResult {
  allowed: boolean;
  remainingCents: number;
  useBYOK: boolean;
  byokProvider?: 'openai' | 'anthropic' | 'google';
}

export async function checkBudget(userId: string): Promise<BudgetCheckResult> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, remainingCents: 0, useBYOK: false };
  }

  const budgetCents = subscription.llmBudgetCents || 0;
  const spentCents = subscription.llmSpentCents || 0;
  const remainingCents = budgetCents - spentCents;

  // Check for BYOK
  const byokKey = await db.query.byokKeys.findFirst({
    where: eq(byokKeys.userId, userId),
  });

  // If budget exhausted but BYOK exists, can use BYOK
  if (remainingCents <= 0 && byokKey) {
    return {
      allowed: true,
      remainingCents: 0,
      useBYOK: true,
      byokProvider: byokKey.provider as 'openai' | 'anthropic' | 'google',
    };
  }

  // If BYOK priority is 'byok_first', always use BYOK
  if (byokKey && byokKey.priority === 'byok_first') {
    return {
      allowed: true,
      remainingCents,
      useBYOK: true,
      byokProvider: byokKey.provider as 'openai' | 'anthropic' | 'google',
    };
  }

  return {
    allowed: remainingCents > 0,
    remainingCents,
    useBYOK: false,
  };
}

export async function getAIProvider(userId: string): Promise<{
  provider: OpenAIProvider;
  useBYOK: boolean;
  model: LanguageModel;
}> {
  const budgetCheck = await checkBudget(userId);

  if (budgetCheck.useBYOK) {
    const byokKey = await db.query.byokKeys.findFirst({
      where: eq(byokKeys.userId, userId),
    });

    if (byokKey && byokKey.provider === 'openai') {
      const provider = createOpenAI({
        apiKey: decrypt(byokKey.apiKeyEncrypted),
      });
      return {
        provider,
        useBYOK: true,
        model: provider('gpt-5.2'),
      };
    }
  }

  // Default to platform key
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return {
    provider,
    useBYOK: false,
    model: provider('gpt-5.2'),
  };
}
