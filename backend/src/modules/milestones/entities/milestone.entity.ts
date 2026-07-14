import { ApiProperty } from '@nestjs/swagger';
import type { Milestone } from '../../../generated/prisma/client';
import type { MilestoneStatus } from '../constants/milestone-status';

export class MilestoneEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  ownerId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  status: MilestoneStatus;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ nullable: true })
  achievedDate: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: MilestoneEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.status = props.status;
    this.dueDate = props.dueDate;
    this.achievedDate = props.achievedDate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(milestone: Milestone): MilestoneEntity {
    return new MilestoneEntity({
      id: milestone.id,
      organizationId: milestone.organizationId,
      projectId: milestone.projectId,
      ownerId: milestone.ownerId,
      name: milestone.name,
      code: milestone.code,
      description: milestone.description,
      status: milestone.status as MilestoneStatus,
      dueDate: milestone.dueDate,
      achievedDate: milestone.achievedDate,
      isActive: milestone.isActive,
      createdAt: milestone.createdAt,
    });
  }
}
