import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { FeaturesModule } from '../features/features.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectModulesModule } from '../project-modules/project-modules.module';
import { ProjectsModule } from '../projects/projects.module';
import { SprintsModule } from '../sprints/sprints.module';
import { TasksController } from './tasks.controller';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    OrganizationsModule,
    ProjectsModule,
    ProjectModulesModule,
    FeaturesModule,
    SprintsModule,
    EmployeesModule,
  ],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
