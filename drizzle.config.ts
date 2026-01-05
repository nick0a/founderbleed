import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load from .env.local for Next.js projects
config({ path: '.env.local' });

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
