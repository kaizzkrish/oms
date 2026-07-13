import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DepartmentsService } from '../src/modules/departments/departments.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Designations (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let departmentsService: DepartmentsService;
  let accessToken: string;
  let orgId: string;
  let departmentId: string;
  let otherOrgId: string;

  const admin = {
    email: `designations-e2e-admin-${Date.now()}@example.com`,
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
    organizationsService = moduleFixture.get(OrganizationsService);
    departmentsService = moduleFixture.get(DepartmentsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Designations E2E Role',
      [
        'Designations.View',
        'Designations.Create',
        'Designations.Update',
        'Designations.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Designations E2E Org ${Date.now()}`,
    });
    orgId = org.id;
    const department = await departmentsService.createDepartment({
      organizationId: orgId,
      name: 'Main Department',
    });
    departmentId = department.id;
    const otherOrg = await organizationsService.createOrganization({
      name: `Designations E2E Other Org ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/designations').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a designation', async () => {
    const name = `Designations E2E Designation ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ organizationId: orgId, departmentId, name, code: 'E2E' })
      .expect(201);
    const designationId: string = createResponse.body.data.id;

    const listResponse = await request(app.getHttpServer())
      .get('/api/designations')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/designations/${designationId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/designations/${designationId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    await request(app.getHttpServer())
      .delete(`/api/designations/${designationId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/designations')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/designations')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: designationId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/designations/${designationId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate designation names within the same organization', async () => {
    const name = `Designations E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(409);
  });

  it('allows the same designation name in a different organization', async () => {
    const name = `Designations E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({ organizationId: otherOrgId, name })
      .expect(201);
  });

  it('rejects a department that belongs to a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        departmentId,
        name: `Designations E2E Cross Org ${Date.now()}`,
      })
      .expect(400);
  });

  it('filters designations by organization and department', async () => {
    const designationsForDepartment = await request(app.getHttpServer())
      .get('/api/designations')
      .query({ organizationId: orgId, departmentId })
      .set(...auth())
      .expect(200);
    expect(
      designationsForDepartment.body.data.items.every(
        (d: { departmentId: string }) => d.departmentId === departmentId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent designation', async () => {
    await request(app.getHttpServer())
      .get('/api/designations/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a designation under a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/designations')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Designation',
      })
      .expect(404);
  });
});
