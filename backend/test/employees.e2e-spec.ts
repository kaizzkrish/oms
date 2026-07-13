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

describe('Employees (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let departmentsService: DepartmentsService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let departmentId: string;
  let otherOrgId: string;

  const admin = {
    email: `employees-e2e-admin-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  function makeEmployeeUser(tag: string) {
    return {
      email: `employees-e2e-${tag}-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Employee',
      lastName: tag,
    };
  }

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
    departmentsService = moduleFixture.get(DepartmentsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Employees E2E Role',
      [
        'Employees.View',
        'Employees.Create',
        'Employees.Update',
        'Employees.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Employees E2E Org ${Date.now()}`,
    });
    orgId = org.id;
    const department = await departmentsService.createDepartment({
      organizationId: orgId,
      name: 'Main Department',
    });
    departmentId = department.id;
    const otherOrg = await organizationsService.createOrganization({
      name: `Employees E2E Other Org ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/employees').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({ employeeCode: 'X' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores an employee', async () => {
    const employeeUser = await usersService.createUser(
      makeEmployeeUser('crud'),
    );
    const employeeCode = `EMP-CRUD-${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: orgId,
        departmentId,
        employeeCode,
        dateOfJoining: '2025-01-06',
      })
      .expect(201);
    const employeeId: string = createResponse.body.data.id;
    expect(createResponse.body.data.user.email).toBe(employeeUser.email);

    const listResponse = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ search: employeeCode })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/employees/${employeeId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.employeeCode).toBe(employeeCode);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/employees/${employeeId}`)
      .set(...auth())
      .send({ phone: '+91-9876543210' })
      .expect(200);
    expect(updateResponse.body.data.phone).toBe('+91-9876543210');

    await request(app.getHttpServer())
      .delete(`/api/employees/${employeeId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ search: employeeCode })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ search: employeeCode, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: employeeId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/employees/${employeeId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents a user from being linked to more than one employee profile', async () => {
    const employeeUser = await usersService.createUser(
      makeEmployeeUser('dup-user'),
    );
    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: orgId,
        employeeCode: `EMP-DUP-A-${Date.now()}`,
        dateOfJoining: '2025-01-06',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: orgId,
        employeeCode: `EMP-DUP-B-${Date.now()}`,
        dateOfJoining: '2025-01-06',
      })
      .expect(409);
  });

  it('prevents duplicate employee codes within the same organization', async () => {
    const employeeCode = `EMP-CODE-${Date.now()}`;
    const userA = await usersService.createUser(makeEmployeeUser('code-a'));
    const userB = await usersService.createUser(makeEmployeeUser('code-b'));

    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: userA.id,
        organizationId: orgId,
        employeeCode,
        dateOfJoining: '2025-01-06',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: userB.id,
        organizationId: orgId,
        employeeCode,
        dateOfJoining: '2025-01-06',
      })
      .expect(409);
  });

  it('rejects a department that belongs to a different organization', async () => {
    const employeeUser = await usersService.createUser(
      makeEmployeeUser('cross-org-dept'),
    );

    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: otherOrgId,
        departmentId,
        employeeCode: `EMP-XORG-${Date.now()}`,
        dateOfJoining: '2025-01-06',
      })
      .expect(400);
  });

  it('rejects an employee being set as their own reporting manager', async () => {
    const employeeUser = await usersService.createUser(
      makeEmployeeUser('self-manager'),
    );
    const createResponse = await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: orgId,
        employeeCode: `EMP-SELF-${Date.now()}`,
        dateOfJoining: '2025-01-06',
      })
      .expect(201);
    const employeeId: string = createResponse.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/employees/${employeeId}`)
      .set(...auth())
      .send({ reportingManagerId: employeeId })
      .expect(400);
  });

  it('filters employees by organization and department', async () => {
    const employeesForDepartment = await request(app.getHttpServer())
      .get('/api/employees')
      .query({ organizationId: orgId, departmentId })
      .set(...auth())
      .expect(200);
    expect(
      employeesForDepartment.body.data.items.every(
        (e: { departmentId: string }) => e.departmentId === departmentId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent employee', async () => {
    await request(app.getHttpServer())
      .get('/api/employees/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating an employee under a non-existent organization', async () => {
    const employeeUser = await usersService.createUser(
      makeEmployeeUser('ghost-org'),
    );

    await request(app.getHttpServer())
      .post('/api/employees')
      .set(...auth())
      .send({
        userId: employeeUser.id,
        organizationId: '00000000-0000-0000-0000-000000000000',
        employeeCode: `EMP-GHOST-${Date.now()}`,
        dateOfJoining: '2025-01-06',
      })
      .expect(404);
  });
});
