import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  it('/health (GET) reports Postgres and Redis are up', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      path: '/health',
      data: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
        },
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
