import path from 'node:path';
import dotenv from 'dotenv';

// Mirrors src/main.ts: the project's root .env must win over any
// same-named variable already present in the shell environment.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
