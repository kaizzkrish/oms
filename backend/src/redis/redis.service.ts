import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const commonOptions: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };

    if (process.env.REDIS_URL) {
      super(process.env.REDIS_URL, commonOptions);
    } else {
      super({
        ...commonOptions,
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    this.on('error', (error: Error) => this.logger.error(error.message));
    await this.connect();
    this.logger.log('Connected to Redis');
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
