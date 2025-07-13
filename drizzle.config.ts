// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts', // Ensure this path is correct relative to drizzle.config.ts
  out: './drizzle', // Directory for migration files
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true, // Enable verbose logging to see more details during push/migrate
  strict: true, // Enable strict mode for schema checks
} satisfies Config;