import { ApiProperty } from '@nestjs/swagger';
import type { Project } from '../../../generated/prisma/client';
import type { ProjectPriority } from '../constants/project-priority';
import type { ProjectStatus } from '../constants/project-status';

export class ProjectEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  clientId: string | null;

  @ApiProperty({ nullable: true })
  departmentId: string | null;

  @ApiProperty({ nullable: true })
  projectManagerId: string | null;

  @ApiProperty({ nullable: true })
  teamId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  status: ProjectStatus;

  @ApiProperty()
  priority: ProjectPriority;

  @ApiProperty({ nullable: true })
  startDate: Date | null;

  @ApiProperty({ nullable: true })
  endDate: Date | null;

  @ApiProperty({ nullable: true })
  budget: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: ProjectEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.clientId = props.clientId;
    this.departmentId = props.departmentId;
    this.projectManagerId = props.projectManagerId;
    this.teamId = props.teamId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.budget = props.budget;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(project: Project): ProjectEntity {
    return new ProjectEntity({
      id: project.id,
      organizationId: project.organizationId,
      clientId: project.clientId,
      departmentId: project.departmentId,
      projectManagerId: project.projectManagerId,
      teamId: project.teamId,
      name: project.name,
      code: project.code,
      description: project.description,
      status: project.status as ProjectStatus,
      priority: project.priority as ProjectPriority,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget === null ? null : Number(project.budget),
      isActive: project.isActive,
      createdAt: project.createdAt,
    });
  }
}
