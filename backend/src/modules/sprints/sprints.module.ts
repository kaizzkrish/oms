import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { TeamsModule } from '../teams/teams.module';
import { SprintsController } from './sprints.controller';
import { SprintsRepository } from './sprints.repository';
import { SprintsService } from './sprints.service';

@Module({
  imports: [OrganizationsModule, ProjectsModule, TeamsModule, EmployeesModule],
  controllers: [SprintsController],
  providers: [SprintsRepository, SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
