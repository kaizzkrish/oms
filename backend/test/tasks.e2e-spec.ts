import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { FeaturesService } from '../src/modules/features/features.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectModulesService } from '../src/modules/project-modules/project-modules.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { SprintsService } from '../src/modules/sprints/sprints.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let projectModulesService: ProjectModulesService;
  let featuresService: FeaturesService;
  let sprintsService: SprintsService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;
  let moduleId: string;
  let featureId: string;
  let sprintId: string;
  let employeeId: string;
  let otherOrgId: string;
  let otherProjectId: string;
  let otherModuleId: string;
  let otherFeatureId: string;
  let otherSprintId: string;

  const admin = {
    email: `tasks-e2e-admin-${Date.now()}@example.com`,
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
    projectsService = moduleFixture.get(ProjectsService);
    projectModulesService = moduleFixture.get(ProjectModulesService);
    featuresService = moduleFixture.get(FeaturesService);
    sprintsService = moduleFixture.get(SprintsService);
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Tasks E2E Role',
      ['Tasks.View', 'Tasks.Create', 'Tasks.Update', 'Tasks.Delete'],
    );

    const org = await organizationsService.createOrganization({
      name: `Tasks E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Tasks E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const projectModule = await projectModulesService.createProjectModule({
      organizationId: orgId,
      projectId,
      name: `Tasks E2E Module ${Date.now()}`,
    });
    moduleId = projectModule.id;

    const feature = await featuresService.createFeature({
      organizationId: orgId,
      projectId,
      moduleId,
      name: `Tasks E2E Feature ${Date.now()}`,
    });
    featureId = feature.id;

    const sprint = await sprintsService.createSprint({
      organizationId: orgId,
      projectId,
      name: `Tasks E2E Sprint ${Date.now()}`,
      startDate: '2026-01-01',
      endDate: '2026-01-14',
    });
    sprintId = sprint.id;

    const employeeUser = await usersService.createUser({
      email: `tasks-e2e-assignee-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Task',
      lastName: 'Assignee',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-TASK-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Tasks E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `Tasks E2E Other Project ${Date.now()}`,
    });
    otherProjectId = otherProject.id;

    const otherProjectModule = await projectModulesService.createProjectModule({
      organizationId: otherOrgId,
      projectId: otherProjectId,
      name: `Tasks E2E Other Module ${Date.now()}`,
    });
    otherModuleId = otherProjectModule.id;

    const otherFeature = await featuresService.createFeature({
      organizationId: otherOrgId,
      projectId: otherProjectId,
      moduleId: otherModuleId,
      name: `Tasks E2E Other Feature ${Date.now()}`,
    });
    otherFeatureId = otherFeature.id;

    const otherSprint = await sprintsService.createSprint({
      organizationId: otherOrgId,
      projectId: otherProjectId,
      name: `Tasks E2E Other Sprint ${Date.now()}`,
      startDate: '2026-01-01',
      endDate: '2026-01-14',
    });
    otherSprintId = otherSprint.id;

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
    await request(app.getHttpServer()).get('/api/tasks').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a task', async () => {
    const name = `Tasks E2E Task ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        moduleId,
        featureId,
        sprintId,
        assigneeId: employeeId,
        name,
        code: 'TSK',
        type: 'BUG',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2026-01-10',
        estimatedHours: 8,
      })
      .expect(201);
    const taskId: string = createResponse.body.data.id;
    expect(createResponse.body.data.type).toBe('BUG');
    expect(createResponse.body.data.estimatedHours).toBe(8);

    const listResponse = await request(app.getHttpServer())
      .get('/api/tasks')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/tasks/${taskId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/tasks/${taskId}`)
      .set(...auth())
      .send({
        description: 'Updated description',
        status: 'DONE',
        actualHours: 10,
      })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');
    expect(updateResponse.body.data.status).toBe('DONE');
    expect(updateResponse.body.data.actualHours).toBe(10);

    await request(app.getHttpServer())
      .delete(`/api/tasks/${taskId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/tasks')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/tasks')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/tasks/${taskId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('allows duplicate task names within the same project', async () => {
    const name = `Tasks E2E Duplicate Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({ organizationId: orgId, projectId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({ organizationId: orgId, projectId, name })
      .expect(201);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId,
        name: `Tasks E2E Cross Org Project ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a module from a different project', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        moduleId,
        name: `Tasks E2E Cross Project Module ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a feature from a different project', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        featureId,
        name: `Tasks E2E Cross Project Feature ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a sprint from a different project', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        sprintId,
        name: `Tasks E2E Cross Project Sprint ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects an assignee from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        assigneeId: employeeId,
        name: `Tasks E2E Cross Org Assignee ${Date.now()}`,
      })
      .expect(400);
  });

  it('accepts a module, feature, and sprint from the matching other project', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        moduleId: otherModuleId,
        featureId: otherFeatureId,
        sprintId: otherSprintId,
        name: `Tasks E2E Other Project Task ${Date.now()}`,
      })
      .expect(201);
  });

  it('filters tasks by organization, project, module, feature, and sprint', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/tasks')
      .query({
        organizationId: orgId,
        projectId,
        moduleId,
        featureId,
        sprintId,
      })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (t: { moduleId: string }) => t.moduleId === moduleId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent task', async () => {
    await request(app.getHttpServer())
      .get('/api/tasks/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a task under a non-existent project', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Task',
      })
      .expect(404);
  });
});
