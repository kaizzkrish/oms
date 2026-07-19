import { ApiProperty } from '@nestjs/swagger';
import type { Sprint } from '../../../generated/prisma/client';
import type { SprintStatus } from '../constants/sprint-status';

export class SprintEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  teamId: string | null;

  @ApiProperty({ nullable: true })
  scrumMasterId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  goal: string | null;

  @ApiProperty()
  status: SprintStatus;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: SprintEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.teamId = props.teamId;
    this.scrumMasterId = props.scrumMasterId;
    this.name = props.name;
    this.code = props.code;
    this.goal = props.goal;
    this.status = props.status;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(sprint: Sprint): SprintEntity {
    return new SprintEntity({
      id: sprint.id,
      organizationId: sprint.organizationId,
      projectId: sprint.projectId,
      teamId: sprint.teamId,
      scrumMasterId: sprint.scrumMasterId,
      name: sprint.name,
      code: sprint.code,
      goal: sprint.goal,
      status: sprint.status as SprintStatus,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      isActive: sprint.isActive,
      createdAt: sprint.createdAt,
    });
  }
}
