# Architecture Decisions

## Stack
- Next.js App Router with TypeScript
- Tailwind CSS + shadcn/ui for UI
- Drizzle ORM with PostgreSQL (Neon)
- NextAuth.js v5 for authentication
- Stripe for payments
- next-themes for light/dark mode

## Conventions
- Prefer server components in app routes unless client state is required
- Keep data access in src/lib and reuse across routes
- Use env vars via process.env and validate when needed
