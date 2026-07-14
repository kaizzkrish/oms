import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectModulesModule } from '../project-modules/project-modules.module';
import { ProjectsModule } from '../projects/projects.module';
import { FeaturesController } from './features.controller';
import { FeaturesRepository } from './features.repository';
import { FeaturesService } from './features.service';

@Module({
  imports: [
    OrganizationsModule,
    ProjectsModule,
    ProjectModulesModule,
    EmployeesModule,
  ],
  controllers: [FeaturesController],
  providers: [FeaturesRepository, FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
