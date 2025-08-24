import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/schema-mysql.ts',
  out: './drizzle/mysql',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});