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
import { PermissionGroupsService } from '../src/modules/permission-groups/permission-groups.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
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

const DEFAULT_PERMISSION_GROUPS = [
  { name: 'User Management', description: 'Managing user accounts' },
  {
    name: 'Role Management',
    description: 'Managing roles and their user/permission assignments',
  },
  {
    name: 'Permission Management',
    description: 'Managing permissions and permission groups',
  },
] as const;

type PermissionGroupName = (typeof DEFAULT_PERMISSION_GROUPS)[number]['name'];

const DEFAULT_PERMISSIONS: {
  name: string;
  description: string;
  group: PermissionGroupName;
}[] = [
  { name: 'Users.View', description: 'View users', group: 'User Management' },
  {
    name: 'Users.Create',
    description: 'Create users',
    group: 'User Management',
  },
  {
    name: 'Users.Update',
    description: 'Update users',
    group: 'User Management',
  },
  {
    name: 'Users.Delete',
    description: 'Delete or restore users',
    group: 'User Management',
  },
  { name: 'Roles.View', description: 'View roles', group: 'Role Management' },
  {
    name: 'Roles.Create',
    description: 'Create roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.Update',
    description: 'Update roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.Delete',
    description: 'Delete or restore roles',
    group: 'Role Management',
  },
  {
    name: 'Roles.ManageUsers',
    description: 'Assign or unassign users on a role',
    group: 'Role Management',
  },
  {
    name: 'Roles.ManagePermissions',
    description: 'Assign or unassign permissions on a role',
    group: 'Role Management',
  },
  {
    name: 'Permissions.View',
    description: 'View permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Create',
    description: 'Create permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Update',
    description: 'Update permissions',
    group: 'Permission Management',
  },
  {
    name: 'Permissions.Delete',
    description: 'Delete or restore permissions',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.View',
    description: 'View permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Create',
    description: 'Create permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Update',
    description: 'Update permission groups',
    group: 'Permission Management',
  },
  {
    name: 'PermissionGroups.Delete',
    description: 'Delete or restore permission groups',
    group: 'Permission Management',
  },
];

// A Team Leader gets read-only visibility into the access-control screens;
// full management stays exclusive to Admin. Employee gets no permissions of
// its own yet — future modules (Tasks, Projects, ...) will add the
// permissions a regular employee actually needs.
const TEAM_LEADER_PERMISSIONS = ['Users.View', 'Roles.View'];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);
  const permissionGroupsService = app.get(PermissionGroupsService);
  const permissionsService = app.get(PermissionsService);

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

  const roleIdByName = new Map<string, string>();
  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await rolesService.findByName(roleDef.name);
    if (existingRole) {
      Logger.log(`Default role already exists: ${roleDef.name}`, 'Seed');
      roleIdByName.set(roleDef.name, existingRole.id);
    } else {
      const role = await rolesService.createSystemRole(
        roleDef.name,
        roleDef.description,
      );
      Logger.log(`Default role created: ${roleDef.name}`, 'Seed');
      roleIdByName.set(roleDef.name, role.id);
    }
  }

  const adminRoleId = roleIdByName.get('Admin');
  if (adminRoleId && adminUser) {
    const alreadyAssigned = await rolesService.hasUserRole(
      adminUser.id,
      adminRoleId,
    );
    if (alreadyAssigned) {
      Logger.log('Seed admin user already has the Admin role', 'Seed');
    } else {
      await rolesService.assignUser(adminRoleId, adminUser.id);
      Logger.log('Assigned Admin role to seed admin user', 'Seed');
    }
  }

  const groupIdByName = new Map<PermissionGroupName, string>();
  for (const groupDef of DEFAULT_PERMISSION_GROUPS) {
    const existingGroup = await permissionGroupsService.findByName(
      groupDef.name,
    );
    if (existingGroup) {
      Logger.log(
        `Default permission group already exists: ${groupDef.name}`,
        'Seed',
      );
      groupIdByName.set(groupDef.name, existingGroup.id);
    } else {
      const group = await permissionGroupsService.createGroup({
        name: groupDef.name,
        description: groupDef.description,
      });
      Logger.log(`Default permission group created: ${groupDef.name}`, 'Seed');
      groupIdByName.set(groupDef.name, group.id);
    }
  }

  const permissionIdByName = new Map<string, string>();
  for (const permissionDef of DEFAULT_PERMISSIONS) {
    const existingPermission = await permissionsService.findByName(
      permissionDef.name,
    );
    if (existingPermission) {
      Logger.log(
        `Default permission already exists: ${permissionDef.name}`,
        'Seed',
      );
      permissionIdByName.set(permissionDef.name, existingPermission.id);
    } else {
      const groupId = groupIdByName.get(permissionDef.group);
      const permission = await permissionsService.createSystemPermission(
        permissionDef.name,
        permissionDef.description,
        groupId,
      );
      Logger.log(`Default permission created: ${permissionDef.name}`, 'Seed');
      permissionIdByName.set(permissionDef.name, permission.id);
    }
  }

  if (adminRoleId) {
    for (const permissionId of permissionIdByName.values()) {
      const alreadyAssigned = await rolesService.hasRolePermission(
        adminRoleId,
        permissionId,
      );
      if (!alreadyAssigned) {
        await rolesService.assignPermission(adminRoleId, permissionId);
      }
    }
    Logger.log('Assigned all permissions to the Admin role', 'Seed');
  }

  const teamLeaderRoleId = roleIdByName.get('Team Leader');
  if (teamLeaderRoleId) {
    for (const permissionName of TEAM_LEADER_PERMISSIONS) {
      const permissionId = permissionIdByName.get(permissionName);
      if (!permissionId) continue;
      const alreadyAssigned = await rolesService.hasRolePermission(
        teamLeaderRoleId,
        permissionId,
      );
      if (!alreadyAssigned) {
        await rolesService.assignPermission(teamLeaderRoleId, permissionId);
      }
    }
    Logger.log(
      'Assigned view-only permissions to the Team Leader role',
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
