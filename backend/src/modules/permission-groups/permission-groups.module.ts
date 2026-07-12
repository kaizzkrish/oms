import { Module } from '@nestjs/common';
import { PermissionGroupsController } from './permission-groups.controller';
import { PermissionGroupsRepository } from './permission-groups.repository';
import { PermissionGroupsService } from './permission-groups.service';

@Module({
  controllers: [PermissionGroupsController],
  providers: [PermissionGroupsRepository, PermissionGroupsService],
  exports: [PermissionGroupsService],
})
export class PermissionGroupsModule {}
