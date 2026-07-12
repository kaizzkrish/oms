import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesRepository, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
