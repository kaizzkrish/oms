import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OfficesController } from './offices.controller';
import { OfficesRepository } from './offices.repository';
import { OfficesService } from './offices.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [OfficesController],
  providers: [OfficesRepository, OfficesService],
  exports: [OfficesService],
})
export class OfficesModule {}
