import path from 'node:path';
import dotenv from 'dotenv';

// Must run before any other import touches `process.env` — identical
// reasoning to src/main.ts. Static imports below compile to CommonJS
// `require()` calls that execute in source order, so this still runs first
// even though ES import syntax is normally hoisted.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const usersService = app.get(UsersService);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@oms.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await usersService.findByEmail(email);
  if (existing) {
    Logger.log(`Seed admin user already exists: ${email}`, 'Seed');
  } else {
    await usersService.createUser({
      email,
      password,
      firstName: 'System',
      lastName: 'Administrator',
    });
    Logger.log(`Seed admin user created: ${email}`, 'Seed');
    Logger.log(
      `Temporary password: ${password} — change this immediately after first login.`,
      'Seed',
    );
  }

  await app.close();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- seed script runs outside Nest's logger context on failure
  console.error(error);
  process.exit(1);
});
