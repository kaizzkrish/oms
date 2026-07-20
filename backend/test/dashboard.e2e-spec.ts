import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DeliverablesService } from '../src/modules/deliverables/deliverables.service';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let accessToken: string;
  let orgId: string;

  const admin = {
    email: `dashboard-e2e-admin-${Date.now()}@example.com`,
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
    const deliverablesService = moduleFixture.get(DeliverablesService);
    const documentsService = moduleFixture.get(DocumentsService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Dashboard E2E Role',
      ['Dashboard.View'],
    );

    const org = await organizationsService.createOrganization({
      name: `Dashboard E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Dashboard E2E Project ${Date.now()}`,
    });

    const employeeUser = await usersService.createUser({
      email: `dashboard-e2e-employee-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Dana',
      lastName: 'Board',
    });
    await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-DASH-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });

    await tasksService.createTask({
      organizationId: orgId,
      projectId: project.id,
      name: `Dashboard E2E Task ${Date.now()}`,
    });

    await deliverablesService.createDeliverable({
      organizationId: orgId,
      projectId: project.id,
      name: `Dashboard E2E Deliverable ${Date.now()}`,
    });

    const fileContents = Buffer.from('Dashboard e2e sample document contents');
    await documentsService.createDocument(
      {
        organizationId: orgId,
        projectId: project.id,
        name: `Dashboard E2E Document ${Date.now()}`,
      },
      {
        originalname: 'dashboard-e2e.txt',
        mimetype: 'text/plain',
        size: fileContents.byteLength,
        buffer: fileContents,
      },
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
    await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .expect(401);
  });

  it('returns a global summary with counts for every entity', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set(...auth())
      .expect(200);

    const summary = response.body.data;
    expect(summary.organizations).toBeGreaterThanOrEqual(1);
    expect(summary.employees).toBeGreaterThanOrEqual(1);
    expect(summary.projects.total).toBeGreaterThanOrEqual(1);
    expect(summary.tasks.total).toBeGreaterThanOrEqual(1);
    expect(summary.deliverables.total).toBeGreaterThanOrEqual(1);
    expect(summary.documents.total).toBeGreaterThanOrEqual(1);
    expect(summary.documents.totalSizeBytes).toBeGreaterThanOrEqual(1);
  });

  it('scopes the summary to a single organization', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .query({ organizationId: orgId })
      .set(...auth())
      .expect(200);

    const summary = response.body.data;
    expect(summary.employees).toBe(1);
    expect(summary.projects.total).toBe(1);
    expect(summary.projects.byStatus.PLANNING).toBe(1);
    expect(summary.tasks.total).toBe(1);
    expect(summary.tasks.byStatus.TODO).toBe(1);
    expect(summary.deliverables.total).toBe(1);
    expect(summary.deliverables.byStatus.PENDING).toBe(1);
    expect(summary.documents.total).toBe(1);
    expect(summary.documents.totalSizeBytes).toBe(
      Buffer.byteLength('Dashboard e2e sample document contents'),
    );
  });

  it('returns zeroed status breakdowns for an organization with no data', async () => {
    const emptyOrg = await organizationsService.createOrganization({
      name: `Dashboard E2E Empty Org ${Date.now()}`,
    });

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .query({ organizationId: emptyOrg.id })
      .set(...auth())
      .expect(200);

    const summary = response.body.data;
    expect(summary.employees).toBe(0);
    expect(summary.projects).toEqual({
      total: 0,
      byStatus: {
        PLANNING: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    });
    expect(summary.documents).toEqual({ total: 0, totalSizeBytes: 0 });
  });
});
