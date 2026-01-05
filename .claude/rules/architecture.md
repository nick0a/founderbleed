# Architecture Decisions

## Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| **Framework** | Next.js 14+ (App Router) | Server components, streaming, modern React |
| **Language** | TypeScript | Type safety, better DX |
| **Database** | PostgreSQL (Neon) | Serverless, scales to zero |
| **ORM** | Drizzle | Type-safe, lightweight, great DX |
| **Auth** | NextAuth.js v5 | Google OAuth, session management |
| **UI** | Tailwind + shadcn/ui | Composable, accessible components |
| **Theme** | next-themes | Dark/light mode with no flash |
| **Payments** | Stripe | Subscriptions, checkout sessions |
| **AI/LLM** | OpenAI / Anthropic / Google | Event classification, planning assistant |
| **Email** | Resend | Transactional emails |
| **Currency** | 12data API | Real-time currency conversion |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── (marketing)/       # Public marketing pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── providers/         # Context providers
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── db/               # Database connection & schema
│   ├── auth.ts           # NextAuth configuration
│   ├── encryption.ts     # AES-256 encryption
│   ├── stripe.ts         # Stripe configuration
│   └── utils.ts          # Utility functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── actions/              # Server actions
```

## API Design Principles

1. **Server Actions First** - Use server actions for mutations
2. **API Routes for Webhooks** - External services hit API routes
3. **Edge-Compatible** - Design for edge runtime where possible
4. **Streaming** - Use suspense and streaming for large data

## State Management

1. **Server State** - React Query / SWR for remote data
2. **URL State** - Use searchParams for filters/pagination
3. **Form State** - React Hook Form with Zod validation
4. **UI State** - React useState/useReducer for local state

## Security Practices

1. **Encrypt PII at Rest** - Event titles, OAuth tokens
2. **Validate All Input** - Zod schemas on all endpoints
3. **Rate Limiting** - API routes have rate limits
4. **CSRF Protection** - NextAuth handles this
5. **Content Security Policy** - Strict CSP headers
