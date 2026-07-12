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

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let accessToken: string;
  let adminId: string;

  const admin = {
    email: `users-e2e-admin-${Date.now()}@example.com`,
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

    usersService = moduleFixture.get(UsersService);
    const rolesService = moduleFixture.get(RolesService);
    const permissionsService = moduleFixture.get(PermissionsService);
    const createdAdmin = await usersService.createUser(admin);
    adminId = createdAdmin.id;
    await grantPermissions(
      rolesService,
      permissionsService,
      adminId,
      'Users E2E Role',
      ['Users.View', 'Users.Create', 'Users.Update', 'Users.Delete'],
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
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set(...auth())
      .send({ email: 'not-an-email', password: 'weak' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a user', async () => {
    const email = `users-e2e-target-${Date.now()}@example.com`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set(...auth())
      .send({
        email,
        password: 'Sup3rSecret!',
        firstName: 'Target',
        lastName: 'User',
      })
      .expect(201);
    expect(createResponse.body.data).toMatchObject({
      email,
      firstName: 'Target',
      isActive: true,
    });
    expect(createResponse.body.data.passwordHash).toBeUndefined();
    const targetId: string = createResponse.body.data.id;

    // Duplicate email is rejected.
    await request(app.getHttpServer())
      .post('/api/users')
      .set(...auth())
      .send({
        email,
        password: 'Sup3rSecret!',
        firstName: 'Target',
        lastName: 'User',
      })
      .expect(409);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/users/${targetId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.email).toBe(email);

    const listResponse = await request(app.getHttpServer())
      .get('/api/users')
      .query({ search: email, page: 1, limit: 10 })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: targetId })]),
    );
    expect(listResponse.body.data.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/users/${targetId}`)
      .set(...auth())
      .send({ firstName: 'Updated' })
      .expect(200);
    expect(updateResponse.body.data.firstName).toBe('Updated');

    await request(app.getHttpServer())
      .delete(`/api/users/${targetId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/users')
      .query({ search: email })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    // The soft-deleted user must still be reachable under the "inactive"
    // filter, otherwise there would be no way to find and restore them.
    const listInactive = await request(app.getHttpServer())
      .get('/api/users')
      .query({ search: email, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: targetId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/users/${targetId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);

    const listAfterRestore = await request(app.getHttpServer())
      .get('/api/users')
      .query({ search: email })
      .set(...auth())
      .expect(200);
    expect(listAfterRestore.body.data.items).toHaveLength(1);
  });

  it('prevents an admin from deleting their own account', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${adminId}`)
      .set(...auth())
      .expect(400);
  });

  it('returns 404 for a non-existent user', async () => {
    await request(app.getHttpServer())
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });
});
