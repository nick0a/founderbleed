# Tech Stack & Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+ (App Router) |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL via Neon |
| **ORM** | Drizzle ORM |
| **Authentication** | NextAuth.js v5 |
| **Hosting** | Vercel |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Theme** | next-themes (dark/light mode) |
| **AI/LLM** | OpenAI / Anthropic / Google APIs |
| **Payments** | Stripe |
| **Email** | Resend |
| **Currency** | 12data API |

## Key Decisions

1. **App Router**: Using Next.js App Router for all new development.
2. **Server Actions**: Prefer Server Actions for mutations over API routes where applicable.
3. **Tailwind v4**: Using the latest Tailwind features.
4. **Shadcn/ui**: Component library for consistent design.
5. **Drizzle ORM**: Type-safe database queries.
