# Architecture Decisions

## Stack
- Next.js App Router with TypeScript
- Tailwind CSS + shadcn/ui for UI components
- Drizzle ORM with PostgreSQL (Neon)
- NextAuth.js v5 for authentication
- next-themes for light/dark mode
- Stripe for billing, Resend for email

## Conventions
- Server components by default; client components only when needed
- Environment variables live in .env.local; placeholders in .env.example
- Keep domain rules in .claude/rules for easy reference
