import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from './schema';

// Test database connection
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result[0]?.connected === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
