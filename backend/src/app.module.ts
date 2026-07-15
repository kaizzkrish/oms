import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PasswordModule } from './common/password/password.module';
import configuration, { AppConfig } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ClientsModule } from './modules/clients/clients.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FeaturesModule } from './modules/features/features.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { OfficesModule } from './modules/offices/offices.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionsGuard } from './modules/permissions/guards/permissions.guard';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProjectModulesModule } from './modules/project-modules/project-modules.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RolesModule } from './modules/roles/roles.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const rateLimit = configService.get('rateLimit', { infer: true });
        return [{ ttl: rateLimit.ttl * 1000, limit: rateLimit.max }];
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const redis = configService.get('redis', { infer: true });
        return {
          connection: redis.url
            ? { url: redis.url }
            : { host: redis.host, port: redis.port, password: redis.password },
        };
      },
    }),
    PrismaModule,
    RedisModule,
    PasswordModule,
    HealthModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    OrganizationsModule,
    OfficesModule,
    DepartmentsModule,
    DesignationsModule,
    EmployeesModule,
    TeamsModule,
    ClientsModule,
    ProjectsModule,
    ProjectModulesModule,
    FeaturesModule,
    MilestonesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
