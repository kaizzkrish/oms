import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let accessToken: string;
  let orgId: string;

  const admin = {
    email: `reports-e2e-admin-${Date.now()}@example.com`,
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
    const projectsService = moduleFixture.get(ProjectsService);
    const employeesService = moduleFixture.get(EmployeesService);
    const tasksService = moduleFixture.get(TasksService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Reports E2E Role',
      ['Reports.View', 'Reports.Export', 'Reports.Delete'],
    );

    const org = await organizationsService.createOrganization({
      name: `Reports E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Reports E2E Project ${Date.now()}`,
    });

    await tasksService.createTask({
      organizationId: orgId,
      projectId: project.id,
      name: `Reports E2E Task ${Date.now()}`,
    });

    const employeeUser = await usersService.createUser({
      email: `reports-e2e-employee-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Rae',
      lastName: 'Port',
    });
    await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-RPT-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });

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
    await request(app.getHttpServer()).get('/api/reports').expect(401);
  });

  it('generates, lists, fetches, downloads, deletes, and restores a report', async () => {
    const name = `Reports E2E Tasks Report ${Date.now()}`;
    const generateResponse = await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({ organizationId: orgId, type: 'TASKS', name })
      .expect(201);
    const reportId: string = generateResponse.body.data.id;
    expect(generateResponse.body.data.type).toBe('TASKS');
    expect(generateResponse.body.data.format).toBe('CSV');
    expect(generateResponse.body.data.fileName).toMatch(/^tasks-\d+\.csv$/);
    expect(generateResponse.body.data.storagePath).toBeUndefined();

    const listResponse = await request(app.getHttpServer())
      .get('/api/reports')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/reports/${reportId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/reports/${reportId}/download`)
      .set(...auth())
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const csvText = (downloadResponse.body as Buffer).toString();
    expect(csvText).toContain('ID,Name,Code,Type,Status');
    expect(downloadResponse.headers['content-type']).toContain('text/csv');
    expect(downloadResponse.headers['content-disposition']).toContain('.csv');

    await request(app.getHttpServer())
      .delete(`/api/reports/${reportId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/reports')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/reports')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: reportId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/reports/${reportId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('defaults the report name using the type and current date', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({ organizationId: orgId, type: 'PROJECTS' })
      .expect(201);

    expect(response.body.data.name).toMatch(
      /^Projects Report - \d{4}-\d{2}-\d{2}$/,
    );
  });

  it('generates an EMPLOYEES report containing linked user data', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({ organizationId: orgId, type: 'EMPLOYEES' })
      .expect(201);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/reports/${response.body.data.id}/download`)
      .set(...auth())
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((downloadResponse.body as Buffer).toString()).toContain('Rae');
  });

  it('rejects invalid report types', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({ organizationId: orgId, type: 'INVALID' })
      .expect(400);
  });

  it('returns 404 when generating a report for a non-existent organization', async () => {
    await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({
        organizationId: '00000000-0000-0000-0000-000000000000',
        type: 'TASKS',
      })
      .expect(404);
  });

  it('filters reports by organization and type', async () => {
    const otherOrg = await organizationsService.createOrganization({
      name: `Reports E2E Other Org ${Date.now()}`,
    });
    await request(app.getHttpServer())
      .post('/api/reports/generate')
      .set(...auth())
      .send({ organizationId: otherOrg.id, type: 'DELIVERABLES' })
      .expect(201);

    const filtered = await request(app.getHttpServer())
      .get('/api/reports')
      .query({ organizationId: orgId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (r: { organizationId: string }) => r.organizationId === orgId,
      ),
    ).toBe(true);

    const filteredByType = await request(app.getHttpServer())
      .get('/api/reports')
      .query({ organizationId: otherOrg.id, type: 'DELIVERABLES' })
      .set(...auth())
      .expect(200);
    expect(filteredByType.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 for a non-existent report', async () => {
    await request(app.getHttpServer())
      .get('/api/reports/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });
});
