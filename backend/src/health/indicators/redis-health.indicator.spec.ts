import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
import { RedisService } from '../../redis/redis.service';

describe('RedisHealthIndicator', () => {
  it('reports up when Redis replies PONG', async () => {
    const healthIndicatorService = new HealthIndicatorService();
    const redis = { ping: jest.fn().mockResolvedValue('PONG') };
    const indicator = new RedisHealthIndicator(
      healthIndicatorService,
      redis as unknown as RedisService,
    );

    const result = await indicator.check('redis');
    expect(result.redis.status).toBe('up');
  });

  it('reports down when Redis throws', async () => {
    const healthIndicatorService = new HealthIndicatorService();
    const redis = {
      ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const indicator = new RedisHealthIndicator(
      healthIndicatorService,
      redis as unknown as RedisService,
    );

    const result = await indicator.check('redis');
    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toContain('ECONNREFUSED');
  });
});
