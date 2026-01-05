# Architecture Decisions

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 14+ (App Router) | Server components by default |
| **Language** | TypeScript | Strict mode enabled |
| **Database** | PostgreSQL (Neon) | Serverless PostgreSQL |
| **ORM** | Drizzle ORM | Type-safe queries |
| **Auth** | NextAuth.js v5 | Google OAuth for calendar access |
| **UI** | Tailwind CSS + shadcn/ui | Component library |
| **Theme** | next-themes | Dark/light mode support |
| **Payments** | Stripe | Subscriptions and one-time payments |
| **AI/LLM** | OpenAI / Anthropic / Google | Task classification, planning assistant |
| **Email** | Resend | Transactional emails |
| **Currency** | Twelve Data API | Real-time currency conversion |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth-related pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui components
│   └── providers/         # Context providers
├── lib/
│   ├── db/               # Database connection and schema
│   ├── auth.ts           # NextAuth configuration
│   ├── encryption.ts     # AES-256 encryption utilities
│   └── utils.ts          # General utilities
└── types/
    └── index.ts          # TypeScript type definitions
```

## API Design Principles

1. **Server Actions** for mutations when possible
2. **API Routes** for external integrations (webhooks, OAuth callbacks)
3. **Edge Runtime** for performance-critical routes
4. **Proper error handling** with typed error responses

## Database Patterns

1. Use Drizzle ORM for all database operations
2. Encrypt sensitive fields (tokens, event titles)
3. Soft delete where appropriate
4. Audit timestamps on all tables (created_at, updated_at)

## Security Requirements

1. All OAuth tokens encrypted at rest
2. CSRF protection on all mutations
3. Rate limiting on API routes
4. Input validation with Zod schemas