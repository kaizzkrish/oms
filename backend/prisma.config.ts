import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// `override: true` is required: this project's `.env` must always win over any
// same-named variable already present in the shell environment (e.g. a
// DATABASE_URL left over from an unrelated project on the same machine).
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
