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

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let organizationsService: OrganizationsService;
  let projectsService: ProjectsService;
  let employeesService: EmployeesService;
  let tasksService: TasksService;
  let accessToken: string;
  let otherAccessToken: string;
  let otherUserId: string;

  const admin = {
    email: `notifications-e2e-admin-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Tester',
  };

  const otherUser = {
    email: `notifications-e2e-other-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Other',
    lastName: 'User',
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
    tasksService = moduleFixture.get(TasksService);

    const createdAdmin = await usersService.createUser(admin);
    await grantPermissions(
      rolesService,
      permissionsService,
      createdAdmin.id,
      'Notifications E2E Role',
      ['Notifications.Create'],
    );

    const createdOther = await usersService.createUser(otherUser);
    otherUserId = createdOther.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    accessToken = loginResponse.body.data.accessToken;

    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: otherUser.email, password: otherUser.password })
      .expect(201);
    otherAccessToken = otherLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function auth(): [string, string] {
    return ['Authorization', `Bearer ${accessToken}`];
  }

  function otherAuth(): [string, string] {
    return ['Authorization', `Bearer ${otherAccessToken}`];
  }

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/api/notifications').expect(401);
  });

  it('rejects sending a notification without Notifications.Create permission', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...otherAuth())
      .send({
        targetUserId: otherUserId,
        title: 'Should be rejected',
        message: 'No permission',
      })
      .expect(403);
  });

  it('sends, lists, marks read, dismisses, and restores a notification', async () => {
    const title = `Notifications E2E Notice ${Date.now()}`;
    const sendResponse = await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...auth())
      .send({
        targetUserId: otherUserId,
        type: 'GENERAL',
        title,
        message: 'You have a new announcement',
        link: '/dashboard',
      })
      .expect(201);
    const notificationId: string = sendResponse.body.data.id;
    expect(sendResponse.body.data.userId).toBe(otherUserId);
    expect(sendResponse.body.data.isRead).toBe(false);

    const listResponse = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(...otherAuth())
      .expect(200);
    expect(
      listResponse.body.data.items.some(
        (n: { id: string }) => n.id === notificationId,
      ),
    ).toBe(true);

    const unreadBefore = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(...otherAuth())
      .expect(200);
    expect(unreadBefore.body.data.count).toBeGreaterThanOrEqual(1);

    const readResponse = await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationId}/read`)
      .set(...otherAuth())
      .expect(200);
    expect(readResponse.body.data.isRead).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/notifications/${notificationId}`)
      .set(...otherAuth())
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(...otherAuth())
      .expect(200);
    expect(
      listAfterDelete.body.data.items.some(
        (n: { id: string }) => n.id === notificationId,
      ),
    ).toBe(false);

    const listInactive = await request(app.getHttpServer())
      .get('/api/notifications')
      .query({ isActive: false })
      .set(...otherAuth())
      .expect(200);
    expect(listInactive.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: notificationId })]),
    );

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationId}/restore`)
      .set(...otherAuth())
      .expect(200);
    expect(restoreResponse.body.data.isActive).toBe(true);
  });

  it("returns 404 when trying to read another user's notification", async () => {
    const sendResponse = await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...auth())
      .send({
        targetUserId: otherUserId,
        title: 'Private to other user',
        message: 'Only the recipient can act on this',
      })
      .expect(201);
    const notificationId: string = sendResponse.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationId}/read`)
      .set(...auth())
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/notifications/${notificationId}`)
      .set(...auth())
      .expect(404);
  });

  it('marks all unread notifications as read in one call', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...auth())
      .send({
        targetUserId: otherUserId,
        title: 'Bulk read test 1',
        message: 'First',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...auth())
      .send({
        targetUserId: otherUserId,
        title: 'Bulk read test 2',
        message: 'Second',
      })
      .expect(201);

    const markAllResponse = await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set(...otherAuth())
      .expect(200);
    expect(markAllResponse.body.data.count).toBeGreaterThanOrEqual(2);

    const unreadAfter = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(...otherAuth())
      .expect(200);
    expect(unreadAfter.body.data.count).toBe(0);
  });

  it('returns 404 when sending a notification to a non-existent user', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set(...auth())
      .send({
        targetUserId: '00000000-0000-0000-0000-000000000000',
        title: 'Ghost',
        message: 'Should not be created',
      })
      .expect(404);
  });

  it('notifies an employee automatically when assigned to a task', async () => {
    const org = await organizationsService.createOrganization({
      name: `Notifications E2E Org ${Date.now()}`,
    });
    const project = await projectsService.createProject({
      organizationId: org.id,
      name: `Notifications E2E Project ${Date.now()}`,
    });
    const assigneeUser = await usersService.createUser({
      email: `notifications-e2e-assignee-${Date.now()}@example.com`,
      password: 'Sup3rSecret!',
      firstName: 'Ada',
      lastName: 'Signee',
    });
    const employee = await employeesService.createEmployee({
      userId: assigneeUser.id,
      organizationId: org.id,
      employeeCode: `EMP-NOTIF-${Date.now()}`,
      dateOfJoining: '2025-01-06',
    });

    const taskName = `Notifications E2E Task ${Date.now()}`;
    await tasksService.createTask({
      organizationId: org.id,
      projectId: project.id,
      name: taskName,
      assigneeId: employee.id,
    });

    const assigneeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: assigneeUser.email, password: 'Sup3rSecret!' })
      .expect(201);
    const assigneeToken: string = assigneeLogin.body.data.accessToken;

    const listResponse = await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', `Bearer ${assigneeToken}`)
      .expect(200);

    expect(
      listResponse.body.data.items.some(
        (n: { type: string; message: string }) =>
          n.type === 'TASK_ASSIGNED' && n.message.includes(taskName),
      ),
    ).toBe(true);
  });
});
