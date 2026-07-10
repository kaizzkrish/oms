import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';

type PrismaServiceOptions = {
  adapter: PrismaPg;
  log: [{ emit: 'event'; level: 'error' }, { emit: 'event'; level: 'warn' }];
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('error', (event: Prisma.LogEvent) =>
      this.logger.error(event.message),
    );
    this.$on('warn', (event: Prisma.LogEvent) =>
      this.logger.warn(event.message),
    );
    await this.$connect();
    this.logger.log('Connected to PostgreSQL via Prisma');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
