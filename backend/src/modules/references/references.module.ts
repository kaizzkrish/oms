import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReferencesController } from './references.controller';
import { ReferencesRepository } from './references.repository';
import { ReferencesService } from './references.service';

@Module({
  imports: [OrganizationsModule, ProjectsModule],
  controllers: [ReferencesController],
  providers: [ReferencesRepository, ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
