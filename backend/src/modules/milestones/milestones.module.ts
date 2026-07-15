import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesRepository } from './milestones.repository';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [OrganizationsModule, ProjectsModule, EmployeesModule],
  controllers: [MilestonesController],
  providers: [MilestonesRepository, MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
