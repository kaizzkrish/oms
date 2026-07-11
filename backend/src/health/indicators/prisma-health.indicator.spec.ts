import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from '../../prisma/prisma.service';

describe('PrismaHealthIndicator', () => {
  it('reports up when the database responds', async () => {
    const healthIndicatorService = new HealthIndicatorService();
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const indicator = new PrismaHealthIndicator(
      healthIndicatorService,
      prisma as unknown as PrismaService,
    );

    const result = await indicator.check('database');
    expect(result.database.status).toBe('up');
  });

  it('reports down when the database throws', async () => {
    const healthIndicatorService = new HealthIndicatorService();
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    };
    const indicator = new PrismaHealthIndicator(
      healthIndicatorService,
      prisma as unknown as PrismaService,
    );

    const result = await indicator.check('database');
    expect(result.database.status).toBe('down');
    expect(result.database.message).toContain('connection refused');
  });
});
