import { ApiProperty } from '@nestjs/swagger';
import type { Deliverable } from '../../../generated/prisma/client';
import type { DeliverableStatus } from '../constants/deliverable-status';
import type { DeliverableType } from '../constants/deliverable-type';

export class DeliverableEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  milestoneId: string | null;

  @ApiProperty({ nullable: true })
  ownerId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  type: DeliverableType;

  @ApiProperty()
  status: DeliverableStatus;

  @ApiProperty({ nullable: true })
  dueDate: Date | null;

  @ApiProperty({ nullable: true })
  submittedDate: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: DeliverableEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.milestoneId = props.milestoneId;
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.type = props.type;
    this.status = props.status;
    this.dueDate = props.dueDate;
    this.submittedDate = props.submittedDate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(deliverable: Deliverable): DeliverableEntity {
    return new DeliverableEntity({
      id: deliverable.id,
      organizationId: deliverable.organizationId,
      projectId: deliverable.projectId,
      milestoneId: deliverable.milestoneId,
      ownerId: deliverable.ownerId,
      name: deliverable.name,
      code: deliverable.code,
      description: deliverable.description,
      type: deliverable.type as DeliverableType,
      status: deliverable.status as DeliverableStatus,
      dueDate: deliverable.dueDate,
      submittedDate: deliverable.submittedDate,
      isActive: deliverable.isActive,
      createdAt: deliverable.createdAt,
    });
  }
}
