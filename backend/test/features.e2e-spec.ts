import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectModulesService } from '../src/modules/project-modules/project-modules.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Features (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let projectModulesService: ProjectModulesService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;
  let moduleId: string;
  let employeeId: string;
  let otherOrgId: string;
  let otherProjectId: string;
  let otherModuleId: string;

  const admin = {
    email: `features-e2e-admin-${Date.now()}@example.com`,
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
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Features E2E Role',
      [
        'Features.View',
        'Features.Create',
        'Features.Update',
        'Features.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Features E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Features E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const projectModule = await projectModulesService.createProjectModule({
      organizationId: orgId,
      projectId,
      name: `Features E2E Module ${Date.now()}`,
    });
    moduleId = projectModule.id;

    const employeeUser = await usersService.createUser({
      email: `features-e2e-owner-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Feature',
      lastName: 'Owner',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-FEAT-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Features E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `Features E2E Other Project ${Date.now()}`,
    });
    otherProjectId = otherProject.id;

    const otherProjectModule = await projectModulesService.createProjectModule({
      organizationId: otherOrgId,
      projectId: otherProjectId,
      name: `Features E2E Other Module ${Date.now()}`,
    });
    otherModuleId = otherProjectModule.id;

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
    await request(app.getHttpServer()).get('/api/features').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a feature', async () => {
    const name = `Features E2E Feature ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        moduleId,
        ownerId: employeeId,
        name,
        code: 'HERO',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      })
      .expect(201);
    const featureId: string = createResponse.body.data.id;
    expect(createResponse.body.data.priority).toBe('HIGH');

    const listResponse = await request(app.getHttpServer())
      .get('/api/features')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/features/${featureId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/features/${featureId}`)
      .set(...auth())
      .send({ description: 'Updated description', status: 'ON_HOLD' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');
    expect(updateResponse.body.data.status).toBe('ON_HOLD');

    await request(app.getHttpServer())
      .delete(`/api/features/${featureId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/features')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/features')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: featureId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/features/${featureId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate feature names within the same module', async () => {
    const name = `Features E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({ organizationId: orgId, projectId, moduleId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({ organizationId: orgId, projectId, moduleId, name })
      .expect(409);
  });

  it('allows the same feature name in a different module', async () => {
    const name = `Features E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({ organizationId: orgId, projectId, moduleId, name })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        moduleId: otherModuleId,
        name,
      })
      .expect(201);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId,
        moduleId,
        name: `Features E2E Cross Org Project ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a module from a different project', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        moduleId,
        name: `Features E2E Cross Project Module ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects an owner from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        moduleId: otherModuleId,
        ownerId: employeeId,
        name: `Features E2E Cross Org Owner ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects an end date before the start date', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        moduleId,
        name: `Features E2E Bad Dates ${Date.now()}`,
        startDate: '2026-06-01',
        endDate: '2026-01-01',
      })
      .expect(400);
  });

  it('filters features by organization, project, and module', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/features')
      .query({ organizationId: orgId, projectId, moduleId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (f: { moduleId: string }) => f.moduleId === moduleId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent feature', async () => {
    await request(app.getHttpServer())
      .get('/api/features/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a feature under a non-existent module', async () => {
    await request(app.getHttpServer())
      .post('/api/features')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        moduleId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Feature',
      })
      .expect(404);
  });
});
