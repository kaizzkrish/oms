import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  const testUser = {
    email: `auth-e2e-${Date.now()}@example.com`,
    password: 'Sup3rSecret!',
    firstName: 'Auth',
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
    await usersService.createUser(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  function extractRefreshCookie(response: request.Response): string {
    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : [rawCookies].filter(Boolean);
    const refreshCookie = cookies.find((cookie: string) =>
      cookie.startsWith('oms_refresh_token='),
    );
    if (!refreshCookie) {
      throw new Error('No refresh token cookie was set');
    }
    return refreshCookie.split(';')[0];
  }

  it('rejects protected routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in, fetches the profile, refreshes, lists sessions, changes password, and logs out', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201);

    expect(loginResponse.body.data).toMatchObject({
      accessToken: expect.any(String),
      expiresIn: expect.any(String),
      user: expect.objectContaining({ email: testUser.email }),
    });
    expect(loginResponse.body.data.user.passwordHash).toBeUndefined();

    const accessToken: string = loginResponse.body.data.accessToken;
    const refreshCookie = extractRefreshCookie(loginResponse);

    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(profileResponse.body.data.email).toBe(testUser.email);

    const sessionsResponse = await request(app.getHttpServer())
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(sessionsResponse.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ isCurrent: true })]),
    );

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(201);
    const newAccessToken: string = refreshResponse.body.data.accessToken;
    expect(newAccessToken).toEqual(expect.any(String));
    const rotatedRefreshCookie = extractRefreshCookie(refreshResponse);

    // The old refresh token must no longer work after rotation.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .set('Cookie', rotatedRefreshCookie)
      .send({
        currentPassword: testUser.password,
        newPassword: 'NewSup3rSecret!',
      })
      .expect(204);

    // The old password must no longer authenticate.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(401);

    const secondLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'NewSup3rSecret!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${secondLogin.body.data.accessToken}`)
      .expect(204);

    // A blacklisted (logged-out) access token must be rejected immediately.
    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${secondLogin.body.data.accessToken}`)
      .expect(401);
  });

  it('always returns a generic response for forgot-password, regardless of whether the email exists', async () => {
    const known = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(201);
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'no-such-user@example.com' })
      .expect(201);

    expect(known.body.data.message).toBe(unknown.body.data.message);
  });

  it('rejects an invalid password reset token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'AnotherSecret1!' })
      .expect(400);
  });
});
