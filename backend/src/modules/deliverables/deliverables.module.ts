import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesRepository } from './deliverables.repository';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [
    OrganizationsModule,
    ProjectsModule,
    MilestonesModule,
    EmployeesModule,
  ],
  controllers: [DeliverablesController],
  providers: [DeliverablesRepository, DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
