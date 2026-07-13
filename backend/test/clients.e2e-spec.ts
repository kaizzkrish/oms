import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Clients (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let employeeId: string;
  let otherOrgId: string;

  const admin = {
    email: `clients-e2e-admin-${Date.now()}@example.com`,
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
    organizationsService = moduleFixture.get(OrganizationsService);
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Clients E2E Role',
      ['Clients.View', 'Clients.Create', 'Clients.Update', 'Clients.Delete'],
    );

    const org = await organizationsService.createOrganization({
      name: `Clients E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const employeeUser = await usersService.createUser({
      email: `clients-e2e-manager-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Account',
      lastName: 'Manager',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-CLIENTS-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Clients E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

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
    await request(app.getHttpServer()).get('/api/clients').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a client', async () => {
    const name = `Clients E2E Client ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({
        organizationId: orgId,
        accountManagerId: employeeId,
        name,
        code: 'E2E',
        contactEmail: 'contact@example.com',
      })
      .expect(201);
    const clientId: string = createResponse.body.data.id;

    const listResponse = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/clients/${clientId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/clients/${clientId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    await request(app.getHttpServer())
      .delete(`/api/clients/${clientId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: clientId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/clients/${clientId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate client names within the same organization', async () => {
    const name = `Clients E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(409);
  });

  it('allows the same client name in a different organization', async () => {
    const name = `Clients E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({ organizationId: otherOrgId, name })
      .expect(201);
  });

  it('rejects an account manager that belongs to a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        accountManagerId: employeeId,
        name: `Clients E2E Cross Org ${Date.now()}`,
      })
      .expect(400);
  });

  it('filters clients by organization and account manager', async () => {
    const clientsForManager = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ organizationId: orgId, accountManagerId: employeeId })
      .set(...auth())
      .expect(200);
    expect(
      clientsForManager.body.data.items.every(
        (c: { accountManagerId: string }) => c.accountManagerId === employeeId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent client', async () => {
    await request(app.getHttpServer())
      .get('/api/clients/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a client under a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Client',
      })
      .expect(404);
  });
});
