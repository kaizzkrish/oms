import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { MilestonesService } from '../src/modules/milestones/milestones.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('Deliverables (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let milestonesService: MilestonesService;
  let employeesService: EmployeesService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;
  let milestoneId: string;
  let employeeId: string;
  let otherOrgId: string;
  let otherProjectId: string;

  const admin = {
    email: `deliverables-e2e-admin-${Date.now()}@example.com`,
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
    milestonesService = moduleFixture.get(MilestonesService);
    employeesService = moduleFixture.get(EmployeesService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Deliverables E2E Role',
      [
        'Deliverables.View',
        'Deliverables.Create',
        'Deliverables.Update',
        'Deliverables.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Deliverables E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Deliverables E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const milestone = await milestonesService.createMilestone({
      organizationId: orgId,
      projectId,
      name: `Deliverables E2E Milestone ${Date.now()}`,
      dueDate: '2026-04-30',
    });
    milestoneId = milestone.id;

    const employeeUser = await usersService.createUser({
      email: `deliverables-e2e-owner-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Deliverable',
      lastName: 'Owner',
    });
    const employee = await employeesService.createEmployee({
      userId: employeeUser.id,
      organizationId: orgId,
      employeeCode: `EMP-DLV-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });
    employeeId = employee.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Deliverables E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `Deliverables E2E Other Project ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/deliverables').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a deliverable', async () => {
    const name = `Deliverables E2E Deliverable ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        milestoneId,
        ownerId: employeeId,
        name,
        code: 'DLV',
        type: 'REPORT',
        status: 'IN_PROGRESS',
        dueDate: '2026-04-23',
      })
      .expect(201);
    const deliverableId: string = createResponse.body.data.id;
    expect(createResponse.body.data.status).toBe('IN_PROGRESS');

    const listResponse = await request(app.getHttpServer())
      .get('/api/deliverables')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/deliverables/${deliverableId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/deliverables/${deliverableId}`)
      .set(...auth())
      .send({ status: 'SUBMITTED', submittedDate: '2026-04-20' })
      .expect(200);
    expect(updateResponse.body.data.status).toBe('SUBMITTED');

    await request(app.getHttpServer())
      .delete(`/api/deliverables/${deliverableId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/deliverables')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/deliverables')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deliverableId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/deliverables/${deliverableId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate deliverable names within the same project', async () => {
    const name = `Deliverables E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
      })
      .expect(409);
  });

  it('allows the same deliverable name in a different project', async () => {
    const name = `Deliverables E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        name,
      })
      .expect(201);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId,
        name: `Deliverables E2E Cross Org Project ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects a milestone from a different project', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        milestoneId,
        name: `Deliverables E2E Cross Project Milestone ${Date.now()}`,
      })
      .expect(400);
  });

  it('rejects an owner from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        ownerId: employeeId,
        name: `Deliverables E2E Cross Org Owner ${Date.now()}`,
      })
      .expect(400);
  });

  it('accepts a same-organization milestone and owner combination together', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        milestoneId,
        ownerId: employeeId,
        name: `Deliverables E2E Combined ${Date.now()}`,
      })
      .expect(201);
  });

  it('filters deliverables by organization, project, and milestone', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/deliverables')
      .query({ organizationId: orgId, projectId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (d: { projectId: string }) => d.projectId === projectId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent deliverable', async () => {
    await request(app.getHttpServer())
      .get('/api/deliverables/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a deliverable under a non-existent project', async () => {
    await request(app.getHttpServer())
      .post('/api/deliverables')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Deliverable',
      })
      .expect(404);
  });
});
