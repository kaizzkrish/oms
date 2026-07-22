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

describe('Documents (e2e)', () => {
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
    email: `documents-e2e-admin-${Date.now()}@example.com`,
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
      'Documents E2E Role',
      [
        'Documents.View',
        'Documents.Create',
        'Documents.Update',
        'Documents.Delete',
      ],
    );

    const org = await organizationsService.createOrganization({
      name: `Documents E2E Org ${Date.now()}`,
    });
    orgId = org.id;

    const project = await projectsService.createProject({
      organizationId: orgId,
      name: `Documents E2E Project ${Date.now()}`,
    });
    projectId = project.id;

    const otherOrg = await organizationsService.createOrganization({
      name: `Documents E2E Other Org ${Date.now()}`,
    });
    otherOrgId = otherOrg.id;

    const otherProject = await projectsService.createProject({
      organizationId: otherOrgId,
      name: `Documents E2E Other Project ${Date.now()}`,
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
    await request(app.getHttpServer()).get('/api/documents').expect(401);
  });

  it('rejects a create request without a file', async () => {
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .expect(400);
  });

  it('rejects a disallowed file type', async () => {
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .attach('file', Buffer.from('MZ...'), {
        filename: 'setup.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(415);
  });

  it('uploads, lists, fetches, downloads, updates, deletes, and restores a document', async () => {
    const name = `Documents E2E Document ${Date.now()}`;
    const fileContents = 'Master Services Agreement contents';
    const createResponse = await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .field('name', name)
      .field('type', 'CONTRACT')
      .field('description', 'The signed MSA')
      .attach('file', Buffer.from(fileContents), {
        filename: 'msa.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const documentId: string = createResponse.body.data.id;
    expect(createResponse.body.data.type).toBe('CONTRACT');
    expect(createResponse.body.data.fileName).toBe('msa.pdf');
    expect(createResponse.body.data.mimeType).toBe('application/pdf');
    expect(createResponse.body.data.sizeBytes).toBe(
      Buffer.byteLength(fileContents),
    );
    expect(createResponse.body.data.storagePath).toBeUndefined();

    const listResponse = await request(app.getHttpServer())
      .get('/api/documents')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/documents/${documentId}`)
      .set(...auth())
      .expect(200);
    expect(getResponse.body.data.name).toBe(name);

    const downloadResponse = await request(app.getHttpServer())
      .get(`/api/documents/${documentId}/download`)
      .set(...auth())
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((downloadResponse.body as Buffer).toString()).toBe(fileContents);
    expect(downloadResponse.headers['content-type']).toContain(
      'application/pdf',
    );
    expect(downloadResponse.headers['content-disposition']).toContain(
      'msa.pdf',
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/documents/${documentId}`)
      .set(...auth())
      .send({ description: 'Updated description', type: 'OTHER' })
      .expect(200);
    expect(updateResponse.body.data.description).toBe('Updated description');
    expect(updateResponse.body.data.type).toBe('OTHER');

    await request(app.getHttpServer())
      .delete(`/api/documents/${documentId}`)
      .set(...auth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/documents')
      .query({ search: name })
      .set(...auth())
      .expect(200);
    expect(listAfterDelete.body.data.items).toHaveLength(0);

    const listInactive = await request(app.getHttpServer())
      .get('/api/documents')
      .query({ search: name, isActive: false })
      .set(...auth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: documentId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/documents/${documentId}/restore`)
      .set(...auth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it('defaults the document name to the uploaded file name', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .attach('file', Buffer.from('contents'), {
        filename: `unnamed-${Date.now()}.txt`,
        contentType: 'text/plain',
      })
      .expect(201);

    expect(response.body.data.name).toBe(response.body.data.fileName);
  });

  it('prevents duplicate document names within the same project', async () => {
    const name = `Documents E2E Dup ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .field('name', name)
      .attach('file', Buffer.from('one'), {
        filename: 'one.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .field('name', name)
      .attach('file', Buffer.from('two'), {
        filename: 'two.txt',
        contentType: 'text/plain',
      })
      .expect(409);
  });

  it('rejects a project from a different organization', async () => {
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', otherOrgId)
      .field('projectId', projectId)
      .attach('file', Buffer.from('data'), {
        filename: 'cross-org.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('filters documents by organization and project', async () => {
    const filtered = await request(app.getHttpServer())
      .get('/api/documents')
      .query({ organizationId: orgId, projectId })
      .set(...auth())
      .expect(200);
    expect(
      filtered.body.data.items.every(
        (d: { projectId: string }) => d.projectId === projectId,
      ),
    ).toBe(true);
  });

  it('returns 404 for a non-existent document', async () => {
    await request(app.getHttpServer())
      .get('/api/documents/00000000-0000-0000-0000-000000000000')
      .set(...auth())
      .expect(404);
  });

  it('returns 404 when creating a document under a non-existent project', async () => {
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', '00000000-0000-0000-0000-000000000000')
      .attach('file', Buffer.from('data'), {
        filename: 'ghost.txt',
        contentType: 'text/plain',
      })
      .expect(404);
  });

  it('accepts the same document name in a different project', async () => {
    const name = `Documents E2E Shared Name ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', orgId)
      .field('projectId', projectId)
      .field('name', name)
      .attach('file', Buffer.from('one'), {
        filename: 'one.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/documents')
      .set(...auth())
      .field('organizationId', otherOrgId)
      .field('projectId', otherProjectId)
      .field('name', name)
      .attach('file', Buffer.from('two'), {
        filename: 'two.txt',
        contentType: 'text/plain',
      })
      .expect(201);
  });
});
