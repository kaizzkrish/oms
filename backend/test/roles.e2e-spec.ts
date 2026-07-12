import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';

describe('Roles (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let rolesService: RolesService;
  let accessToken: string;
  let targetUserId: string;

  const admin = {
    email: `roles-e2e-admin-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  const targetUser = {
    email: `roles-e2e-target-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Target',
    lastName: 'User',
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

    usersService = moduleFixture.get(UsersService);
    rolesService = moduleFixture.get(RolesService);

    await usersService.createUser(admin);
    const createdTarget = await usersService.createUser(targetUser);
    targetUserId = createdTarget.id;

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
    await request(app.getHttpServer()).get('/api/roles').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/roles')
      .set(...auth())
      .send({ name: 'x' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, assigns, unassigns, deletes, and restores a role', async () => {
    const name = `Roles E2E Role ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/roles')
      .set(...auth())
      .send({ name, description: 'Created by e2e test' })
      .expect(201);
    const roleId: string = createResponse.body.data.id;
    expect(createResponse.body.data.isSystem).toBe(false);
    expect(createResponse.body.data.userCount).toBe(0);

    const listResponse = await request(app.getHttpServer())
      .get('/api/roles')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/roles/${roleId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/roles/${roleId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    // Assign the target user to the role.
    await request(app.getHttpServer())
      .post(`/api/roles/${roleId}/users/${targetUserId}`)
      .set(...auth())
      .expect(204);

    const usersForRole = await request(app.getHttpServer())
      .get(`/api/roles/${roleId}/users`)
      .set(...auth())
      .expect(200);
    expect(usersForRole.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: targetUserId })]),
    );

    // Re-assigning the same user is a conflict.
    await request(app.getHttpServer())
      .post(`/api/roles/${roleId}/users/${targetUserId}`)
      .set(...auth())
      .expect(409);

    // A role with an assigned user cannot be deleted.
    await request(app.getHttpServer())
      .delete(`/api/roles/${roleId}`)
      .set(...auth())
      .expect(409);

    // Unassign, then deletion succeeds.
    await request(app.getHttpServer())
      .delete(`/api/roles/${roleId}/users/${targetUserId}`)
      .set(...auth())
      .expect(204);

    // Unassigning again (already removed) is now not-found.
    await request(app.getHttpServer())
      .delete(`/api/roles/${roleId}/users/${targetUserId}`)
      .set(...auth())
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/roles/${roleId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/roles')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/roles')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: roleId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/roles/${roleId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('cannot assign a user to an inactive role', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/roles')
      .set(...auth())
      .send({
        name: `Roles E2E Inactive Role ${Date.now()}`,
        isActive: false,
      })
      .expect(201);
    const roleId: string = createResponse.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/roles/${roleId}/users/${targetUserId}`)
      .set(...auth())
      .expect(400);
  });

  it('protects system roles from renaming, deactivation, and deletion', async () => {
    const systemRole = await rolesService.createSystemRole(
      `Roles E2E System Role ${Date.now()}`,
      'Seeded directly, not via the public API',
    );

    await request(app.getHttpServer())
      .patch(`/api/roles/${systemRole.id}`)
      .set(...auth())
      .send({ name: 'Renamed' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/roles/${systemRole.id}`)
      .set(...auth())
      .send({ isActive: false })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/roles/${systemRole.id}`)
      .set(...auth())
      .expect(400);
  });

  it('returns 404 for a non-existent role', async () => {
    await request(app.getHttpServer())
      .get('/api/roles/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });
});
