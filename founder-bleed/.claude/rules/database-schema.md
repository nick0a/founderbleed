# Database Schema

Drizzle schema lives in src/lib/db/schema.ts and evolves per phase.

## Notes
- Use PostgreSQL via Neon
- Keep schema definitions co-located with related domain types
- Add indexes for audit runs and calendar events once defined
