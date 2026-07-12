import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Permissions (e2e)', () => {
  let app: INestApplication<App>;
  let permissionsService: PermissionsService;
  let rolesService: RolesService;
  let accessToken: string;

  const admin = {
    email: `permissions-e2e-admin-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const usersService = moduleFixture.get(UsersService);
    rolesService = moduleFixture.get(RolesService);
    permissionsService = moduleFixture.get(PermissionsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Permissions E2E Role',
      [
        'PermissionGroups.View',
        'PermissionGroups.Create',
        'PermissionGroups.Update',
        'PermissionGroups.Delete',
        'Permissions.View',
        'Permissions.Create',
        'Permissions.Update',
        'Permissions.Delete',
        'Roles.View',
        'Roles.ManagePermissions',
      ],
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function auth(): [string, string] {
    return ['Authorization', `Bearer ${accessToken}`];
  }

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/api/permissions').expect(401);
  });

  it('rejects requests from a user without the required permission', async () => {
    const noPermUser = {
      email: `permissions-e2e-noperm-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'No',
      lastName: 'Perm',
    };
    const usersService = app.get(UsersService);
    await usersService.createUser(noPermUser);
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: noPermUser.email, password: noPermUser.password })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/permissions')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(403);
  });

  it('rejects invalid permission names', async () => {
    await request(app.getHttpServer())
      .post('/api/permissions')
      .set(...auth())
      .send({ name: 'not-a-valid-name' })
      .expect(400);
  });

  it('returns the effective permission names for the current user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/permissions/me')
      .set(...auth())
      .expect(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining(['Permissions.View', 'Roles.ManagePermissions']),
    );
  });

  it('creates, lists, fetches, updates, deletes, and restores a permission group', async () => {
    const name = `Permissions E2E Group ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set(...auth())
      .send({ name, description: 'Created by e2e test' })
      .expect(201);
    const groupId: string = createResponse.body.data.id;
    expect(createResponse.body.data.permissionCount).toBe(0);

    const listResponse = await request(app.getHttpServer())
      .get('/api/permission-groups')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/permission-groups/${groupId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    // Creating a permission inside the group blocks the group from being deleted.
    const permissionName = `E2E.GroupedPermission${Date.now()}`;
    const permissionResponse = await request(app.getHttpServer())
      .post('/api/permissions')
      .set(...auth())
      .send({ name: permissionName, groupId })
      .expect(201);
    const groupedPermissionId: string = permissionResponse.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/permission-groups/${groupId}`)
      .set(...auth())
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/permissions/${groupedPermissionId}`)
      .set(...auth())
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/permission-groups/${groupId}`)
      .set(...auth())
      .expect(204);

    const listInactive = await request(app.getHttpServer())
      .get('/api/permission-groups')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: groupId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/permission-groups/${groupId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('creates, lists, fetches, updates, assigns to a role, unassigns, deletes, and restores a permission', async () => {
    const name = `E2E.Permission${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/permissions')
      .set(...auth())
      .send({ name, description: 'Created by e2e test' })
      .expect(201);
    const permissionId: string = createResponse.body.data.id;
    expect(createResponse.body.data.isSystem).toBe(false);

    const listResponse = await request(app.getHttpServer())
      .get('/api/permissions')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/permissions/${permissionId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    const role = await rolesService.createRole({
      name: `Permissions E2E Target Role ${Date.now()}`,
    });

    await request(app.getHttpServer())
      .post(`/api/roles/${role.id}/permissions/${permissionId}`)
      .set(...auth())
      .expect(204);

    const rolePermissions = await request(app.getHttpServer())
      .get(`/api/roles/${role.id}/permissions`)
      .set(...auth())
      .expect(200);
    expect(rolePermissions.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: permissionId })]),
    );

    // Re-assigning is a conflict; deleting while assigned is blocked.
    await request(app.getHttpServer())
      .post(`/api/roles/${role.id}/permissions/${permissionId}`)
      .set(...auth())
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/permissions/${permissionId}`)
      .set(...auth())
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/roles/${role.id}/permissions/${permissionId}`)
      .set(...auth())
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/roles/${role.id}/permissions/${permissionId}`)
      .set(...auth())
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/permissions/${permissionId}`)
      .set(...auth())
      .expect(204);

    const listInactive = await request(app.getHttpServer())
      .get('/api/permissions')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: permissionId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/permissions/${permissionId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('protects system permissions from renaming, deactivation, and deletion', async () => {
    const systemPermission = await permissionsService.createSystemPermission(
      `E2E.SystemPermission${Date.now()}`,
      'Seeded directly, not via the public API',
    );

    await request(app.getHttpServer())
      .patch(`/api/permissions/${systemPermission.id}`)
      .set(...auth())
      .send({ name: 'Renamed.Permission' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/permissions/${systemPermission.id}`)
      .set(...auth())
      .send({ isActive: false })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/permissions/${systemPermission.id}`)
      .set(...auth())
      .expect(400);
  });

  it('returns 404 for a non-existent permission and permission group', async () => {
    await request(app.getHttpServer())
      .get('/api/permissions/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/permission-groups/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });
});
