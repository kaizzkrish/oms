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
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Milestones (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;
  let employeeId: string;
  let otherOrgId: string;
  let otherProjectId: string;

  const admin = {
    email: `milestones-e2e-admin-${Date.now()}@example.com`,
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
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Milestones E2E Role',
      [
        'Milestones.View',
        'Milestones.Create',
        'Milestones.Update',
        'Milestones.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Milestones E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Milestones E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const employeeUser = await usersService.createUser({
      email: `milestones-e2e-owner-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Milestone',
      lastName: 'Owner',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-MILE-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Milestones E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `Milestones E2E Other Project ${Date.now()}`,
    });
    otherProjectId = otherProject.id;

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
    await request(app.getHttpServer()).get('/api/milestones').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a milestone', async () => {
    const name = `Milestones E2E Milestone ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        ownerId: employeeId,
        name,
        code: 'BETA',
        status: 'AT_RISK',
        dueDate: '2026-04-30',
      })
      .expect(201);
    const milestoneId: string = createResponse.body.data.id;
    expect(createResponse.body.data.status).toBe('AT_RISK');

    const listResponse = await request(app.getHttpServer())
      .get('/api/milestones')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/milestones/${milestoneId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/milestones/${milestoneId}`)
      .set(...auth())
      .send({
        description: 'Updated description',
        status: 'ACHIEVED',
        achievedDate: '2026-04-25',
      })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');
    expect(updateResponse.body.data.status).toBe('ACHIEVED');
    expect(updateResponse.body.data.achievedDate).toBeTruthy();

    await request(app.getHttpServer())
      .delete(`/api/milestones/${milestoneId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/milestones')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/milestones')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: milestoneId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/milestones/${milestoneId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate milestone names within the same project', async () => {
    const name = `Milestones E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({ organizationId: orgId, projectId, name, dueDate: '2026-04-30' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({ organizationId: orgId, projectId, name, dueDate: '2026-05-01' })
      .expect(409);
  });

  it('allows the same milestone name in a different project', async () => {
    const name = `Milestones E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({ organizationId: orgId, projectId, name, dueDate: '2026-04-30' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        name,
        dueDate: '2026-04-30',
      })
      .expect(201);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId,
        name: `Milestones E2E Cross Org Project ${Date.now()}`,
        dueDate: '2026-04-30',
      })
      .expect(400);
  });

  it('rejects an owner from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        ownerId: employeeId,
        name: `Milestones E2E Cross Org Owner ${Date.now()}`,
        dueDate: '2026-04-30',
      })
      .expect(400);
  });

  it('filters milestones by organization and project', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/milestones')
      .query({ organizationId: orgId, projectId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (m: { projectId: string }) => m.projectId === projectId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent milestone', async () => {
    await request(app.getHttpServer())
      .get('/api/milestones/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a milestone under a non-existent project', async () => {
    await request(app.getHttpServer())
      .post('/api/milestones')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Milestone',
        dueDate: '2026-04-30',
      })
      .expect(404);
  });
});
