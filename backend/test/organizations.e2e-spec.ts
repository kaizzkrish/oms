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

describe('Organizations (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  const admin = {
    email: `organizations-e2e-admin-${Date.now()}@example.com`,
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
    const rolesService = moduleFixture.get(RolesService);
    const permissionsService = moduleFixture.get(PermissionsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Organizations E2E Role',
      [
        'Organizations.View',
        'Organizations.Create',
        'Organizations.Update',
        'Organizations.Delete',
        'Offices.View',
        'Offices.Create',
        'Offices.Update',
        'Offices.Delete',
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
    await request(app.getHttpServer()).get('/api/organizations').expect(401);
  });

  it('rejects requests from a user without the required permission', async () => {
    const noPermUser = {
      email: `organizations-e2e-noperm-${Date.now()}@example.com`,
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
      .get('/api/organizations')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(403);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/organizations')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores an organization, blocked while it has offices', async () => {
    const name = `Organizations E2E Org ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .set(...auth())
      .send({ name, industry: 'Testing' })
      .expect(201);
    const orgId: string = createResponse.body.data.id;
    expect(createResponse.body.data.officeCount).toBe(0);

    const listResponse = await request(app.getHttpServer())
      .get('/api/organizations')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/organizations/${orgId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/organizations/${orgId}`)
      .set(...auth())
      .send({ industry: 'Finance' })
      .expect(200);
    expect(updateResponse.body.data.industry).toBe('Finance');

    // Create an office under this organization.
    const officeCreateResponse = await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: orgId,
        name: 'Headquarters',
        addressLine1: '1 Corporate Park',
        city: 'Mumbai',
        country: 'India',
      })
      .expect(201);
    const officeId: string = officeCreateResponse.body.data.id;

    // The organization now has an office and can't be deleted.
    await request(app.getHttpServer())
      .delete(`/api/organizations/${orgId}`)
      .set(...auth())
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/offices/${officeId}`)
      .set(...auth())
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/organizations/${orgId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/organizations')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/organizations')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: orgId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/organizations/${orgId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('only one office per organization can be the headquarters', async () => {
    const orgResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .set(...auth())
      .send({ name: `Organizations E2E HQ Org ${Date.now()}` })
      .expect(201);
    const orgId: string = orgResponse.body.data.id;

    const firstOffice = await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: orgId,
        name: 'First Office',
        isHeadquarters: true,
        addressLine1: '1 Main St',
        city: 'Delhi',
        country: 'India',
      })
      .expect(201);
    expect(firstOffice.body.data.isHeadquarters).toBe(true);

    const secondOffice = await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: orgId,
        name: 'Second Office',
        isHeadquarters: true,
        addressLine1: '2 Main St',
        city: 'Bengaluru',
        country: 'India',
      })
      .expect(201);
    expect(secondOffice.body.data.isHeadquarters).toBe(true);

    const firstOfficeRefetched = await request(app.getHttpServer())
      .get(`/api/offices/${firstOffice.body.data.id}`)
      .set(...auth())
      .expect(200);
    expect(firstOfficeRefetched.body.data.isHeadquarters).toBe(false);
  });

  it('filters offices by organization id', async () => {
    const orgAResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .set(...auth())
      .send({ name: `Organizations E2E Org A ${Date.now()}` })
      .expect(201);
    const orgBResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .set(...auth())
      .send({ name: `Organizations E2E Org B ${Date.now()}` })
      .expect(201);
    const orgAId: string = orgAResponse.body.data.id;
    const orgBId: string = orgBResponse.body.data.id;

    await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: orgAId,
        name: 'Org A Office',
        addressLine1: '1 A St',
        city: 'Pune',
        country: 'India',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: orgBId,
        name: 'Org B Office',
        addressLine1: '1 B St',
        city: 'Chennai',
        country: 'India',
      })
      .expect(201);

    const officesForOrgA = await request(app.getHttpServer())
      .get('/api/offices')
      .query({ organizationId: orgAId })
      .set(...auth())
      .expect(200);
    expect(officesForOrgA.body.data.items).toHaveLength(1);
    expect(officesForOrgA.body.data.items[0].name).toBe('Org A Office');
  });

  it('returns 404 for a non-existent organization and office', async () => {
    await request(app.getHttpServer())
      .get('/api/organizations/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/offices/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating an office under a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/offices')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Office',
        addressLine1: '1 Nowhere St',
        city: 'Nowhere',
        country: 'Nowhere',
      })
      .expect(404);
  });
});
