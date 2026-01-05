# Database Schema

This file serves as a reference for the database schema.
The source of truth is `src/lib/db/schema.ts`.

## Current Status
Phase 0: Initial Setup. Schema is empty.

## Planned Entities (Future Phases)

- **Users**: NextAuth user data
- **AuditRuns**: Metadata for each calendar audit
- **Events**: Calendar events and their classification
- **TeamComposition**: Current team structure (defines tiers visibility)
- **Settings**: User preferences (rates, currency, dark mode)

## Conventions
- Use Drizzle ORM
- PostgreSQL database
- Snake case for column names in DB
- Camel case for keys in JS/TS
