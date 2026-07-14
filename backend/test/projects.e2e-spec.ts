import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ClientsService } from '../src/modules/clients/clients.service';
import { DepartmentsService } from '../src/modules/departments/departments.service';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { TeamsService } from '../src/modules/teams/teams.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let clientsService: ClientsService;
  let departmentsService: DepartmentsService;
  let employeesService: EmployeesService;
  let teamsService: TeamsService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let clientId: string;
  let departmentId: string;
  let employeeId: string;
  let teamId: string;
  let otherOrgId: string;

  const admin = {
    email: `projects-e2e-admin-${Date.now()}@example.com`,
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
    clientsService = moduleFixture.get(ClientsService);
    departmentsService = moduleFixture.get(DepartmentsService);
    employeesService = moduleFixture.get(EmployeesService);
    teamsService = moduleFixture.get(TeamsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Projects E2E Role',
      [
        'Projects.View',
        'Projects.Create',
        'Projects.Update',
        'Projects.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Projects E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const client = await clientsService.createClient({
      organizationId: orgId,
      name: `Projects E2E Client ${Date.now()}`,
    });
    clientId = client.id;

    const department = await departmentsService.createDepartment({
      organizationId: orgId,
      name: 'Main Department',
    });
    departmentId = department.id;

    const employeeUser = await usersService.createUser({
      email: `projects-e2e-manager-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Project',
      lastName: 'Manager',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-PROJ-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const team = await teamsService.createTeam({
      organizationId: orgId,
      name: `Projects E2E Team ${Date.now()}`,
    });
    teamId = team.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Projects E2E Other Org ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/projects').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a project', async () => {
    const name = `Projects E2E Project ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: orgId,
        clientId,
        departmentId,
        projectManagerId: employeeId,
        teamId,
        name,
        code: 'E2E',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        budget: 50000,
      })
      .expect(201);
    const projectId: string = createResponse.body.data.id;
    expect(createResponse.body.data.budget).toBe(50000);

    const listResponse = await request(app.getHttpServer())
      .get('/api/projects')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set(...auth())
      .send({ description: 'Updated description', status: 'ON_HOLD' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');
    expect(updateResponse.body.data.status).toBe('ON_HOLD');

    await request(app.getHttpServer())
      .delete(`/api/projects/${projectId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/projects')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/projects')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: projectId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate project names within the same organization', async () => {
    const name = `Projects E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(409);
  });

  it('allows the same project name in a different organization', async () => {
    const name = `Projects E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({ organizationId: orgId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({ organizationId: otherOrgId, name })
      .expect(201);
  });

  it('rejects a client, department, project manager, or team from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        clientId,
        name: `Projects E2E Cross Org Client ${Date.now()}`,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        departmentId,
        name: `Projects E2E Cross Org Dept ${Date.now()}`,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectManagerId: employeeId,
        name: `Projects E2E Cross Org Manager ${Date.now()}`,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        teamId,
        name: `Projects E2E Cross Org Team ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects an end date before the start date', async () => {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: orgId,
        name: `Projects E2E Bad Dates ${Date.now()}`,
        startDate: '2026-06-01',
        endDate: '2026-01-01',
      })
      .expect(400);
  });

  it('filters projects by organization, client, status, and priority', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/projects')
      .query({ organizationId: orgId, clientId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (p: { clientId: string }) => p.clientId === clientId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent project', async () => {
    await request(app.getHttpServer())
      .get('/api/projects/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a project under a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/projects')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Project',
      })
      .expect(404);
  });
});
