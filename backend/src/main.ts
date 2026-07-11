import path from 'node:path';
import dotenv from 'dotenv';

// Must run before any other import touches `process.env` (including Nest's
// own ConfigModule): this project's root `.env` always wins over a
// same-named variable already present in the shell, since this machine has
// been observed to carry leftover env vars from unrelated projects.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';
import { createWinstonOptions } from './logger/winston.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(
      createWinstonOptions(
        process.env.LOG_LEVEL ?? 'info',
        process.env.NODE_ENV ?? 'development',
      ),
    ),
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const backendConfig = configService.get('backend', { infer: true });

  app.use(helmet());
  app.enableCors({ origin: backendConfig.corsOrigin, credentials: true });
  app.setGlobalPrefix(backendConfig.apiPrefix, { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get('app', { infer: true }).name)
    .setDescription('Enterprise Office Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(backendConfig.swaggerPath, app, swaggerDocument);

  await app.listen(backendConfig.port);
  Logger.log(
    `Application listening on port ${backendConfig.port} (prefix: /${backendConfig.apiPrefix}, docs: /${backendConfig.swaggerPath})`,
    'Bootstrap',
  );
}

void bootstrap();
