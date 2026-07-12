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
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';

const DEFAULT_ROLES = [
  { name: 'Admin', description: 'Full administrative access to the system' },
  {
    name: 'Team Leader',
    description: 'Manages a team and its projects, tasks, and members',
  },
  { name: 'Employee', description: 'Standard employee access' },
] as const;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@oms.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  let adminUser = await usersService.findByEmail(email);
  if (adminUser) {
    Logger.log(`Seed admin user already exists: ${email}`, 'Seed');
  } else {
    adminUser = await usersService.createUser({
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

  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await rolesService.findByName(roleDef.name);
    if (existingRole) {
      Logger.log(`Default role already exists: ${roleDef.name}`, 'Seed');
    } else {
      await rolesService.createSystemRole(roleDef.name, roleDef.description);
      Logger.log(`Default role created: ${roleDef.name}`, 'Seed');
    }
  }

  const adminRole = await rolesService.findByName('Admin');
  if (adminRole) {
    const alreadyAssigned = await rolesService.hasUserRole(
      adminUser.id,
      adminRole.id,
    );
    if (alreadyAssigned) {
      Logger.log('Seed admin user already has the Admin role', 'Seed');
    } else {
      await rolesService.assignUser(adminRole.id, adminUser.id);
      Logger.log('Assigned Admin role to seed admin user', 'Seed');
    }
  }

  await app.close();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- seed script runs outside Nest's logger context on failure
  console.error(error);
  process.exit(1);
});
