import { Module } from '@nestjs/common';
import { OfficesModule } from '../offices/offices.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsRepository } from './departments.repository';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [OrganizationsModule, OfficesModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsRepository, DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
