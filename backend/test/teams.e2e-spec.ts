import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DepartmentsService } from '../src/modules/departments/departments.service';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Teams (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let departmentsService: DepartmentsService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let departmentId: string;
  let employeeId: string;
  let otherOrgId: string;
  let otherOrgEmployeeId: string;

  const admin = {
    email: `teams-e2e-admin-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  function makeEmployeeUser(tag: string) {
    return {
      email: `teams-e2e-${tag}-${Date.now()}@example.com`,
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
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Teams E2E Role',
      [
        'Teams.View',
        'Teams.Create',
        'Teams.Update',
        'Teams.Delete',
        'Teams.ManageMembers',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Teams E2E Org ${Date.now()}`,
    });
    orgId = org.id;
    const department = await departmentsService.createDepartment({
      organizationId: orgId,
      name: 'Main Department',
    });
    departmentId = department.id;

    const employeeUser = await usersService.createUser(
      makeEmployeeUser('member'),
    );
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-TEAMS-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Teams E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;
    const otherOrgEmployeeUser = await usersService.createUser(
      makeEmployeeUser('other-org-member'),
    );
    const otherOrgEmployee = await employeesService.createEmployee({
      userId: otherOrgEmployeeUser.id,
      organizationId: otherOrgId,
      employeeCode: `EMP-TEAMS-OTHER-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    otherOrgEmployeeId = otherOrgEmployee.id;

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
    await request(app.getHttpServer()).get('/api/teams').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a team', async () => {
    const name = `Teams E2E Team ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ organizationId: orgId, departmentId, name, code: 'E2E' })
      .expect(201);
    const teamId: string = createResponse.body.data.id;
    expect(createResponse.body.data.memberCount).toBe(0);

    const listResponse = await request(app.getHttpServer())
      .get('/api/teams')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/teams/${teamId}`)
      .set(...auth())
      .send({ description: 'Updated description' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');

    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/teams')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/teams')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: teamId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/teams/${teamId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate team names within the same organization', async () => {
    const name = `Teams E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(409);
  });

  it('allows the same team name in a different organization', async () => {
    const name = `Teams E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({ organizationId: otherOrgId, name })
      .expect(201);
  });

  it('rejects a department that belongs to a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        departmentId,
        name: `Teams E2E Cross Org ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a team leader that belongs to a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        teamLeaderId: employeeId,
        name: `Teams E2E Cross Org Leader ${Date.now()}`,
      })
      .expect(400);
  });

  it('manages team membership: add, list, prevent duplicates, and remove', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({
        organizationId: orgId,
        name: `Teams E2E Membership ${Date.now()}`,
      })
      .expect(201);
    const teamId: string = createResponse.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/teams/${teamId}/members/${employeeId}`)
      .set(...auth())
      .expect(204);

    const membersResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}/members`)
      .set(...auth())
      .expect(200);
    expect(membersResponse.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: employeeId })]),
    );

    await request(app.getHttpServer())
      .post(`/api/teams/${teamId}/members/${employeeId}`)
      .set(...auth())
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/teams/${teamId}/members/${otherOrgEmployeeId}`)
      .set(...auth())
      .expect(400);

    const teamResponse = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set(...auth())
      .expect(200);
    expect(teamResponse.body.data.memberCount).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}`)
      .set(...auth())
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}/members/${employeeId}`)
      .set(...auth())
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}/members/${employeeId}`)
      .set(...auth())
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}`)
      .set(...auth())
      .expect(204);
  });

  it('filters teams by organization and department', async () => {
    const teamsForDepartment = await request(app.getHttpServer())
      .get('/api/teams')
      .query({ organizationId: orgId, departmentId })
      .set(...auth())
      .expect(200);
    expect(
      teamsForDepartment.body.data.items.every(
        (t: { departmentId: string }) => t.departmentId === departmentId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent team', async () => {
    await request(app.getHttpServer())
      .get('/api/teams/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a team under a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/teams')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Team',
      })
      .expect(404);
  });
});
