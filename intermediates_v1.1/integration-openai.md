# OpenAI Integration Guide

## Overview

This document provides complete implementation instructions for integrating OpenAI's Chat Completions API into the Founder Bleed Planning Assistant. The integration uses the Vercel AI SDK for streaming responses in Next.js.

---

## Prerequisites

- OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Understanding of LLM budget tracking (for subscription tier management)

---

## Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Installation

### Option 1: Vercel AI SDK (Recommended for Next.js)

```bash
npm install ai @ai-sdk/openai @ai-sdk/react
```

### Option 2: OpenAI SDK Directly

```bash
npm install openai
```

**Sources:**
- [Vercel AI SDK Getting Started](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)
- [OpenAI Node.js Library](https://github.com/openai/openai-node)

---

## Available Models

| Model | Context Window | Max Output | Best For | Pricing (per 1M tokens) |
|-------|---------------|------------|----------|-------------------------|
| `gpt-4o` | 128K | 16K | General use, multimodal | $5 input / $15 output |
| `gpt-4o-mini` | 128K | 16K | Cost-effective tasks | $0.15 input / $0.60 output |
| `gpt-4-turbo` | 128K | 4K | Legacy (use gpt-4o) | $10 input / $30 output |
| `gpt-4.1` | 1M | 32K | Coding, long context | Latest pricing on OpenAI |
| `gpt-4.1-mini` | 1M | 32K | Cost-effective coding | Latest pricing on OpenAI |

**Recommendation:** Use `gpt-4o` for the Planning Assistant due to its balance of capability and cost.

**Sources:**
- [OpenAI Models Documentation](https://platform.openai.com/docs/models)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [GPT-4o Model Info](https://platform.openai.com/docs/models/gpt-4o)

---

## Vercel AI SDK Implementation

### SDK Configuration

Create `src/lib/ai.ts`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict', // Ensures proper error handling
});

// Default model configuration
export const DEFAULT_MODEL = 'gpt-4o';

// Model selection based on task complexity
export function getModel(tier: 'standard' | 'premium' = 'standard') {
  return tier === 'premium' ? openai('gpt-4o') : openai('gpt-4o-mini');
}
```

**Source:** [Vercel AI SDK Introduction](https://ai-sdk.dev/docs/introduction)

---

## Streaming Chat Implementation

### Route Handler

Create `src/app/api/planning/chat/route.ts`:

```typescript
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@/lib/ai';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auditRuns, users, subscriptions } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
  });

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { messages, auditId }: { messages: UIMessage[]; auditId?: string } = await req.json();

  // Get audit data for context injection
  let auditContext = '';
  if (auditId) {
    const audit = await db.query.auditRuns.findFirst({
      where: eq(auditRuns.id, auditId),
    });

    if (audit?.computedMetrics) {
      const metrics = audit.computedMetrics as {
        efficiencyScore: number;
        hoursByTier: Record<string, number>;
        reclaimableHours: number;
      };

      auditContext = `
User's Audit Data:
- Efficiency Score: ${metrics.efficiencyScore}%
- Planning Score: ${audit.planningScore}%
- Hours by tier: Unique: ${metrics.hoursByTier.unique || 0}h, Founder: ${metrics.hoursByTier.founder || 0}h, Senior: ${metrics.hoursByTier.senior || 0}h, Junior: ${metrics.hoursByTier.junior || 0}h, EA: ${metrics.hoursByTier.ea || 0}h
- Reclaimable hours per week: ${metrics.reclaimableHours}h
`;
    }
  }

  const systemPrompt = `You are a productivity coach helping founders optimize their calendar.
You have access to their audit results showing how they spend time.

${auditContext}

If they do not mention it in their message, you should query whether they are planning their day, week or month and focus on that timeframe.

When suggesting calendar changes:
- Be specific with times and durations
- Explain why each change helps
- Consider their role (mostly Unique/Founder work vs delegable)
- Suggest protecting time for high-value work
- Recommend delegating low-value tasks to other team members
- Be specific about who they should delegate to and what they should delegate

You can suggest new events to add to their calendar.
Format event suggestions as JSON in a code block:
\`\`\`json
{
  "type": "event_suggestion",
  "title": "Focus: Product Strategy",
  "start": "2025-01-07T09:00:00",
  "end": "2025-01-07T12:00:00",
  "tier": "unique"
}
\`\`\``;

  try {
    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: 0.7,
      maxTokens: 2000,
      onError({ error }) {
        console.error('OpenAI streaming error:', error);
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('Planning chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
```

**Source:** [Vercel AI SDK - Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)

---

## Frontend Chat Component

Create `src/components/planning/chat.tsx`:

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Loader2 } from 'lucide-react';

interface PlanningChatProps {
  auditId?: string;
}

export function PlanningChat({ auditId }: PlanningChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/planning/chat',
    body: { auditId },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse event suggestions from AI response
  const parseEventSuggestions = (content: string) => {
    const jsonRegex = /```json\n([\s\S]*?)\n```/g;
    const suggestions: Array<{
      type: string;
      title: string;
      start: string;
      end: string;
      tier: string;
    }> = [];

    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.type === 'event_suggestion') {
          suggestions.push(parsed);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return suggestions;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>Start a conversation to get planning recommendations</p>
            <p className="text-sm mt-2">Try: "Help me plan my week"</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Render event suggestions */}
              {message.role === 'assistant' &&
                parseEventSuggestions(message.content).map((suggestion, i) => (
                  <Card key={i} className="mt-4 p-4 border-2 border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📅</span>
                      <span className="font-semibold">{suggestion.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(suggestion.start).toLocaleString()} -{' '}
                      {new Date(suggestion.end).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Tier: {suggestion.tier}
                    </p>
                    <Button size="sm" className="mt-2">
                      Add to Calendar
                    </Button>
                  </Card>
                ))}
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Card>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about planning your day, week, or month..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Source:** [Vercel AI SDK React Hooks](https://ai-sdk.dev/docs/ai-sdk-ui)

---

## Token Usage Tracking

### Tracking Usage in Route Handler

```typescript
import { streamText, experimental_wrapLanguageModel } from 'ai';
import { openai } from '@/lib/ai';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Token usage tracking wrapper
const trackUsage = experimental_wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: {
    transformParams: async ({ params }) => params,
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();

      // Log usage for debugging
      console.log('Token usage:', result.usage);

      return result;
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      return { stream, ...rest };
    },
  },
});

export async function POST(req: NextRequest) {
  // ... authentication and setup

  const result = streamText({
    model: openai('gpt-4o'),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ usage }) => {
      if (usage) {
        // Calculate cost in cents (GPT-4o pricing)
        const inputCost = (usage.promptTokens / 1_000_000) * 500; // $5 per 1M
        const outputCost = (usage.completionTokens / 1_000_000) * 1500; // $15 per 1M
        const totalCostCents = Math.ceil((inputCost + outputCost) * 100);

        // Update subscription LLM spend
        await db.update(subscriptions)
          .set({
            llmSpentCents: sql`${subscriptions.llmSpentCents} + ${totalCostCents}`,
          })
          .where(eq(subscriptions.userId, session.user.id));

        console.log('Usage tracked:', {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalCostCents,
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Getting Usage from Streaming

When streaming, usage is available in the final chunk with `stream_options`:

```typescript
// Using OpenAI SDK directly (if needed)
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
  stream_options: { include_usage: true }, // Include usage in stream
});

let usage = null;
for await (const chunk of stream) {
  if (chunk.usage) {
    usage = chunk.usage;
  }
  // Process chunk...
}

console.log('Final usage:', usage);
```

**Sources:**
- [OpenAI API Token Usage](https://help.openai.com/en/articles/6614209-how-do-i-check-my-token-usage)
- [Token Usage with OpenAI Streams](https://openmeter.io/blog/token-usage-with-openai-streams-and-nextjs)

---

## API Parameters Reference

### Chat Completions Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | Required | Model ID (e.g., `gpt-4o`) |
| `messages` | array | Required | Conversation messages |
| `temperature` | number | 1.0 | Randomness (0-2). Lower = more focused |
| `max_tokens` | number | Model limit | Maximum tokens to generate |
| `top_p` | number | 1.0 | Nucleus sampling threshold |
| `frequency_penalty` | number | 0 | Penalize repeated tokens (-2 to 2) |
| `presence_penalty` | number | 0 | Penalize topic repetition (-2 to 2) |
| `stop` | string/array | null | Stop sequences |
| `stream` | boolean | false | Enable streaming |
| `seed` | number | null | For deterministic outputs |

### Message Roles

| Role | Description |
|------|-------------|
| `system` | Sets behavior/context for the assistant |
| `user` | User's input messages |
| `assistant` | Model's previous responses |
| `tool` | Tool/function call results |

**Source:** [OpenAI Chat Completions API Reference](https://platform.openai.com/docs/api-reference/chat)

---

## BYOK (Bring Your Own Key) Support

Create `src/lib/ai-byok.ts`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '@/lib/db';
import { byokKeys, subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export type AIProvider = 'openai' | 'anthropic' | 'google';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

export async function getAIClient(userId: string) {
  // Check for BYOK keys
  const byokKey = await db.query.byokKeys.findFirst({
    where: eq(byokKeys.userId, userId),
  });

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  // Determine which key to use based on priority setting
  let config: AIConfig | null = null;

  if (byokKey) {
    const priority = byokKey.priority || 'budget_first';
    const budgetRemaining = (subscription?.llmBudgetCents || 0) - (subscription?.llmSpentCents || 0);

    if (priority === 'byok_first') {
      // Always use BYOK
      config = {
        provider: byokKey.provider as AIProvider,
        apiKey: decrypt(byokKey.apiKeyEncrypted),
      };
    } else if (priority === 'budget_first' && budgetRemaining <= 0) {
      // Budget exhausted, fall back to BYOK
      config = {
        provider: byokKey.provider as AIProvider,
        apiKey: decrypt(byokKey.apiKeyEncrypted),
      };
    }
  }

  // Default to platform OpenAI key
  if (!config) {
    config = {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
    };
  }

  // Create provider instance
  switch (config.provider) {
    case 'openai':
      return createOpenAI({ apiKey: config.apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey });
    default:
      return createOpenAI({ apiKey: config.apiKey });
  }
}
```

---

## Error Handling

```typescript
import OpenAI from 'openai';

try {
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toUIMessageStreamResponse();

} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error('OpenAI API Error:', {
      status: error.status,
      message: error.message,
      code: error.code,
      type: error.type,
    });

    // Handle specific errors
    switch (error.status) {
      case 400:
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      case 401:
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      case 403:
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      case 429:
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again.' }, { status: 429 });
      case 500:
      case 502:
      case 503:
        return NextResponse.json({ error: 'OpenAI service unavailable' }, { status: 503 });
      default:
        return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }
  }

  // Network or unknown error
  console.error('Unknown error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Error Types:**
- `400 BadRequestError`: Invalid request parameters
- `401 AuthenticationError`: Invalid API key
- `403 PermissionDeniedError`: Insufficient permissions
- `404 NotFoundError`: Resource not found
- `422 UnprocessableEntityError`: Semantic error
- `429 RateLimitError`: Rate limit exceeded
- `>=500 InternalServerError`: OpenAI server error

**Source:** [OpenAI Node.js Library - Error Handling](https://github.com/openai/openai-node#handling-errors)

---

## Budget Checking Middleware

Create `src/lib/ai-budget.ts`:

```typescript
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  remainingCents: number;
}> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription) {
    return { allowed: false, remainingCents: 0 };
  }

  const budgetCents = subscription.llmBudgetCents || 0;
  const spentCents = subscription.llmSpentCents || 0;
  const remainingCents = budgetCents - spentCents;

  return {
    allowed: remainingCents > 0,
    remainingCents,
  };
}

// Budget amounts by tier (in cents)
export const TIER_BUDGETS = {
  starter: 300,    // $3.00/month
  pro: 750,        // $7.50/month
  enterprise: 1350, // $13.50/month
};
```

---

## Cost Estimation

Estimate costs before making requests:

```typescript
import { encoding_for_model } from 'tiktoken';

export function estimateTokens(text: string, model: string = 'gpt-4o'): number {
  try {
    const enc = encoding_for_model(model as any);
    const tokens = enc.encode(text);
    enc.free();
    return tokens.length;
  } catch {
    // Fallback: rough estimate (4 chars per token)
    return Math.ceil(text.length / 4);
  }
}

export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string = 'gpt-4o'
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5, output: 15 },       // per 1M tokens
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10, output: 30 },
  };

  const rates = pricing[model] || pricing['gpt-4o'];

  const inputCost = (promptTokens / 1_000_000) * rates.input;
  const outputCost = (completionTokens / 1_000_000) * rates.output;

  return inputCost + outputCost; // Returns cost in dollars
}
```

**Note:** Install tiktoken: `npm install tiktoken`

**Source:** [OpenAI Tokenizer](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

---

## Sources

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat)
- [OpenAI Node.js Library](https://github.com/openai/openai-node)
- [OpenAI Streaming Documentation](https://platform.openai.com/docs/api-reference/chat-streaming)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Vercel AI SDK Introduction](https://ai-sdk.dev/docs/introduction)
- [Vercel AI SDK - Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)
- [Vercel AI SDK - Generating Text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [Token Usage with OpenAI Streams](https://openmeter.io/blog/token-usage-with-openai-streams-and-nextjs)
- [OpenAI Token Counting](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)
