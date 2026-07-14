import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectModulesController } from './project-modules.controller';
import { ProjectModulesRepository } from './project-modules.repository';
import { ProjectModulesService } from './project-modules.service';

@Module({
  imports: [OrganizationsModule, ProjectsModule, EmployeesModule],
  controllers: [ProjectModulesController],
  providers: [ProjectModulesRepository, ProjectModulesService],
  exports: [ProjectModulesService],
})
export class ProjectModulesModule {}
