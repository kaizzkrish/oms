import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { RolesService } from '../src/modules/roles/roles.service';
import { UsersService } from '../src/modules/users/users.service';
import { grantPermissions } from './helpers/grant-permissions';

describe('References (e2e)', () => {
  let app: INestApplication<App>;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let usersService: UsersService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;
  let otherOrgId: string;
  let otherProjectId: string;

  const admin = {
    email: `references-e2e-admin-${Date.now()}@example.com`,
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

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'References E2E Role',
      [
        'References.View',
        'References.Create',
        'References.Update',
        'References.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `References E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `References E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `References E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `References E2E Other Project ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/references').expect(401);
  });

  it('rejects invalid create payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({ name: 'A' })
      .expect(400);
  });

  it('rejects a non-url value for url', async () => {
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name: `References E2E Bad Url ${Date.now()}`,
        url: 'not-a-url',
      })
      .expect(400);
  });

  it('creates, lists, fetches, updates, deletes, and restores a reference', async () => {
    const name = `References E2E Reference ${Date.now()}`;
    const createResponse = await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
        url: 'https://figma.com/file/example',
        type: 'DESIGN',
        description: 'The shared design system file',
      })
      .expect(201);
    const referenceId: string = createResponse.body.data.id;
    expect(createResponse.body.data.type).toBe('DESIGN');

    const listResponse = await request(app.getHttpServer())
      .get('/api/references')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/references/${referenceId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/references/${referenceId}`)
      .set(...auth())
      .send({ url: 'https://figma.com/file/updated', type: 'OTHER' })
      .expect(200);
    expect(updateResponse.body.data.url).toBe('https://figma.com/file/updated');
    expect(updateResponse.body.data.type).toBe('OTHER');

    await request(app.getHttpServer())
      .delete(`/api/references/${referenceId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/references')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/references')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: referenceId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/references/${referenceId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('prevents duplicate reference names within the same project', async () => {
    const name = `References E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
        url: 'https://example.com/one',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
        url: 'https://example.com/two',
      })
      .expect(409);
  });

  it('allows the same reference name in a different project', async () => {
    const name = `References E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId,
        name,
        url: 'https://example.com/one',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId: otherProjectId,
        name,
        url: 'https://example.com/two',
      })
      .expect(201);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: otherOrgId,
        projectId,
        name: `References E2E Cross Org Project ${Date.now()}`,
        url: 'https://example.com',
      })
      .expect(400);
  });

  it('filters references by organization and project', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/references')
      .query({ organizationId: orgId, projectId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (r: { projectId: string }) => r.projectId === projectId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent reference', async () => {
    await request(app.getHttpServer())
      .get('/api/references/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a reference under a non-existent project', async () => {
    await request(app.getHttpServer())
      .post('/api/references')
      .set(...auth())
      .send({
        organizationId: orgId,
        projectId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost Reference',
        url: 'https://example.com',
      })
      .expect(404);
  });
});
