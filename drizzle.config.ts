// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts', // Ensure this path is correct relative to drizzle.config.ts
  out: './drizzle', // Directory for migration files
  dialect: 'postgresql',
  driver: 'neon', // CHANGED: from 'pg' to 'neon' to align with common serverless PostgreSQL setups like NeonDB
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;