import { ApiProperty } from '@nestjs/swagger';
import type { ProjectModule } from '../../../generated/prisma/client';
import type { ModuleStatus } from '../constants/module-status';

export class ProjectModuleEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  moduleLeadId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  status: ModuleStatus;

  @ApiProperty({ nullable: true })
  startDate: Date | null;

  @ApiProperty({ nullable: true })
  endDate: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: ProjectModuleEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.moduleLeadId = props.moduleLeadId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.status = props.status;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(projectModule: ProjectModule): ProjectModuleEntity {
    return new ProjectModuleEntity({
      id: projectModule.id,
      organizationId: projectModule.organizationId,
      projectId: projectModule.projectId,
      moduleLeadId: projectModule.moduleLeadId,
      name: projectModule.name,
      code: projectModule.code,
      description: projectModule.description,
      status: projectModule.status as ModuleStatus,
      startDate: projectModule.startDate,
      endDate: projectModule.endDate,
      isActive: projectModule.isActive,
      createdAt: projectModule.createdAt,
    });
  }
}
