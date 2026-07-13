import { Module } from '@nestjs/common';
import { DepartmentsModule } from '../departments/departments.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DesignationsController } from './designations.controller';
import { DesignationsRepository } from './designations.repository';
import { DesignationsService } from './designations.service';

@Module({
  imports: [OrganizationsModule, DepartmentsModule],
  controllers: [DesignationsController],
  providers: [DesignationsRepository, DesignationsService],
  exports: [DesignationsService],
})
export class DesignationsModule {}
