import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService<AppConfig, true>) {
    const commonOptions: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };
    const redisConfig = configService.get('redis', { infer: true });

    if (redisConfig.url) {
      super(redisConfig.url, commonOptions);
    } else {
      super({
        ...commonOptions,
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
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
